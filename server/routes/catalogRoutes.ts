import express from 'express';
import prisma from '../lib/db';
import NodeCache from 'node-cache';
import { DealEngineFacade } from '../services/engine/DealEngineFacade';
import { findCatalogPhotoRecord, resolveCatalogImageUrl } from '../utils/catalogImage';
import { buildCatalogSelectedIncentiveIds, CatalogEntry, formatCatalogEntryFromQuote } from '../utils/catalogQuote';

const router = express.Router();
const catalogCache = new NodeCache({ stdTTL: 300 }); // 5 min cache

// Target brands — only these appear in the catalog
const TARGET_BRANDS = [
  'Acura', 'Chevrolet', 'Ford', 'Genesis', 'Hyundai',
  'Kia', 'Lexus', 'Ram', 'Toyota', 'Volvo'
];

// Minimum MSRP threshold (cents) — filter out bad MarketCheck data (used cars, wrong prices)
const MIN_MSRP_CENTS = 1800000; // $18,000
const DEFAULT_CATALOG_LIMIT = 20;
const MAX_CATALOG_LIMIT = 30;
const CATALOG_QUOTE_CONCURRENCY = 10;

interface CatalogCachePayload {
  entries: CatalogEntry[];
  totalCount: number;
  availableMakes: string[];
}

function getReadyCatalogEntries(entries: CatalogEntry[]): CatalogEntry[] {
  return entries.filter(entry => entry.status === 'ready' && entry.imageUrl && entry.imageUrl.startsWith('http'));
}

function parseCatalogLimit(limit: unknown): number {
  const parsed = typeof limit === 'string' ? parseInt(limit, 10) : NaN;
  if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_CATALOG_LIMIT;
  return Math.min(parsed, MAX_CATALOG_LIMIT);
}

async function mapWithConcurrency<T, R>(items: T[], concurrency: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  const workerCount = Math.min(concurrency, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}

async function calculateCatalogQuote(args: {
  trim: any;
  makeName: string;
  modelName: string;
  year: number;
  type: 'lease' | 'finance';
  term: number;
  mileage: number;
  downPaymentCents: number;
  selectedIncentives: string[];
  tier: string;
}) {
  const { trim, makeName, modelName, year, type, term, mileage, downPaymentCents, selectedIncentives, tier } = args;

  return DealEngineFacade.calculateForConsumer({
    vehicleId: trim.id,
    make: makeName,
    model: modelName,
    trim: trim.name,
    year,
    type,
    term,
    mileage,
    downPaymentCents,
    tradeInEquityCents: 0,
    tier,
    zipCode: '90210',
    selectedIncentives: selectedIncentives.length > 0 ? selectedIncentives : ['__NONE__'],
    isFirstTimeBuyer: false,
    hasCosigner: false,
  });
}

/**
 * GET /api/v2/catalog
 * Returns calculated catalog entries for all vehicles with valid data.
 * Only returns entries where MSRP + program exists = payment can be calculated.
 */
router.get('/', async (req, res) => {
  try {
    const {
      make, minPrice, maxPrice, bodyStyle, sort, term: qTerm,
      down: qDown, mileage: qMileage, tier: qTier, limit: qLimit, mode: qMode
    } = req.query;

    const requestedTerm = parseInt(qTerm as string) || 36;
    const requestedDown = parseInt(qDown as string) || 0;
    const requestedMileage = parseInt(qMileage as string) || 10000;
    const downCents = requestedDown * 100;
    const requestedMode = qMode === 'finance' ? 'finance' : 'lease';
    const requestedTier = typeof qTier === 'string' ? qTier : 't1';
    const requestedLimit = parseCatalogLimit(qLimit);
    const selectedMake = typeof make === 'string' && make !== 'All' ? make : null;
    const makeNameFilter = selectedMake ? { equals: selectedMake } : { in: TARGET_BRANDS };

    // Cache key based on params
    const cacheKey = `catalog_${make || 'all'}_${requestedTerm}_${requestedDown}_${requestedMileage}_${requestedTier}_${requestedMode}_${requestedLimit}`;
    const cached = catalogCache.get<CatalogCachePayload>(cacheKey);
    if (cached) {
      const filtered = applyFilters(cached.entries, {
        make: make as string,
        minPrice: minPrice as string,
        maxPrice: maxPrice as string,
        bodyStyle: bodyStyle as string,
        sort: sort as string,
        limit: requestedLimit.toString(),
        mode: qMode as string,
      });
      return res.json({
        entries: filtered,
        totalCount: cached.totalCount,
        availableMakes: cached.availableMakes,
      });
    }

    // 1. Fetch all active trims with their model and make (filtered to target brands + min MSRP)
    const trims = await prisma.vehicleTrim.findMany({
      where: {
        isActive: true,
        msrpCents: { gte: MIN_MSRP_CENTS },
        model: { isActive: true, make: { isActive: true, name: makeNameFilter } }
      },
      include: {
        model: { include: { make: true } }
      },
      orderBy: [
        { msrpCents: 'asc' },
        { name: 'asc' }
      ],
      take: requestedLimit
    });

    // 2b. Fetch car photos
    const photosRecord = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
    const carPhotos: any[] = photosRecord?.data ? JSON.parse(photosRecord.data) : [];
    console.log(`[Catalog] Loaded ${carPhotos.length} car photos`);

    // 3. Fetch active incentives for display/default selection. The quote engine still resolves
    // incentives itself, so catalog math and the VDP calculator share one source of truth.
    const now = new Date();
    const incentives = await prisma.oemIncentiveProgram.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        OR: [
          { effectiveFrom: null },
          { effectiveFrom: { lte: now } }
        ]
      }
    });

    // 5. Build catalog entries
    const entries = await mapWithConcurrency(trims, CATALOG_QUOTE_CONCURRENCY, async (trim) => {
      const makeName = trim.model.make.name;
      // Strip brand prefix from model name (e.g. "Ram 1500 Pickup" → "1500 Pickup" for make "Ram")
      const rawModelName = trim.model.name;
      const modelName = rawModelName.startsWith(makeName + ' ') ? rawModelName.slice(makeName.length + 1) : rawModelName;
      const trimName = trim.name;
      const msrpCents = trim.msrpCents;
      const year = (trim.model as any).years?.[0] || new Date().getFullYear();

      // Find matching photo — priority: trim photoLinks > SiteSettings car_photos > model imageUrl
      let trimPhotos: string[] = [];
      try {
        if (trim.photoLinks) trimPhotos = JSON.parse(trim.photoLinks);
      } catch {}

      const photoUrl = resolveCatalogImageUrl({
        carPhotos,
        makeName,
        rawModelName,
        modelName,
        trimPhotos,
        modelImageUrl: (trim.model as any).imageUrl || null,
      });

      // Find matching incentives for display and for selecting advertised defaults.
      // Conditional rebates are still shown in the detail calculator, but not baked into
      // catalog-card payments unless they are truly default/advertised incentives.
      const matchedIncentives = incentives.filter(inc =>
        (inc.make === makeName || inc.make === 'ALL') &&
        (!inc.model || inc.model === modelName || inc.model === 'ALL' || inc.model === '') &&
        (!inc.trim || inc.trim === trimName || inc.trim === 'ALL' || inc.trim === '') &&
        (inc.dealApplicability === 'ALL' || inc.dealApplicability === requestedMode.toUpperCase()) &&
        (!inc.effectiveTo || inc.effectiveTo >= now)
      );

      const selectedIncentives = buildCatalogSelectedIncentiveIds(matchedIncentives.map(inc => ({
        id: inc.id,
        name: inc.name,
        amountCents: inc.amountCents,
        type: inc.type === 'conditional' ? 'special' : inc.type,
        isDefault: inc.type !== 'conditional',
      })));

      const [leaseQuote, financeQuote] = await Promise.all([
        requestedMode === 'lease'
          ? calculateCatalogQuote({
              trim,
              makeName,
              modelName,
              year,
              type: 'lease',
              term: requestedTerm,
              mileage: requestedMileage,
              downPaymentCents: downCents,
              selectedIncentives,
              tier: requestedTier,
            })
          : Promise.resolve(null),
        requestedMode === 'finance'
          ? calculateCatalogQuote({
              trim,
              makeName,
              modelName,
              year,
              type: 'finance',
              term: requestedTerm,
              mileage: requestedMileage,
              downPaymentCents: downCents,
              selectedIncentives,
              tier: requestedTier,
            })
          : Promise.resolve(null),
      ]);

      return formatCatalogEntryFromQuote({
        trim,
        makeName,
        modelName,
        year,
        photoUrl,
        requestedTerm,
        requestedDown,
        requestedMileage,
        mode: requestedMode,
        leaseQuote,
        financeQuote,
        matchedIncentives: matchedIncentives.map(i => ({
          id: i.id,
          name: i.name,
          amountCents: i.amountCents,
          type: i.type === 'conditional' ? 'special' : i.type,
          isDefault: i.type !== 'conditional',
        })),
      });
    });

    // Cache full result
    const readyEntries = getReadyCatalogEntries(entries);
    const availableMakes = Array.from(new Set(readyEntries.map(entry => entry.make))).sort();
    catalogCache.set(cacheKey, {
      entries,
      totalCount: readyEntries.length,
      availableMakes,
    });

    // Apply filters and return
    const filtered = applyFilters(entries, {
      make: make as string,
      minPrice: minPrice as string,
      maxPrice: maxPrice as string,
      bodyStyle: bodyStyle as string,
      sort: sort as string,
      limit: requestedLimit.toString(),
      mode: qMode as string,
    });
    res.json({
      entries: filtered,
      totalCount: readyEntries.length,
      availableMakes,
    });
  } catch (error: any) {
    console.error('Catalog error:', error);
    res.status(500).json({ error: error?.message || 'Failed to build catalog' });
  }
});

/**
 * GET /api/v2/catalog/:trimId
 * Returns detailed catalog entry for a specific vehicle trim.
 */
router.get('/:trimId', async (req, res) => {
  try {
    const { trimId } = req.params;
    const { term: qTerm, down: qDown, mileage: qMileage, zipCode } = req.query;

    const trim = await prisma.vehicleTrim.findUnique({
      where: { id: trimId },
      include: { model: { include: { make: true } } }
    });

    if (!trim || !trim.isActive) {
      return res.status(404).json({ error: 'Vehicle not found' });
    }

    // Return basic data — frontend will call /api/v2/quote for detailed calculation
    const makeName = trim.model.make.name;
    const rawModelName = trim.model.name;
    const modelName = rawModelName.startsWith(makeName + ' ') ? rawModelName.slice(makeName.length + 1) : rawModelName;

    // Find matching photo — priority: trim photoLinks > sibling trim photos > SiteSettings > model imageUrl
    const photosRec = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
    const photos: any[] = photosRec?.data ? JSON.parse(photosRec.data) : [];
    const detailPhoto = findCatalogPhotoRecord(photos, makeName, rawModelName, modelName);

    let trimPhotos: string[] = [];
    try {
      if (trim.photoLinks) trimPhotos = JSON.parse(trim.photoLinks);
    } catch {}

    // Fallback: find photos from sibling trims of the same model
    if (trimPhotos.length === 0) {
      const siblingTrims = await prisma.vehicleTrim.findMany({
        where: { modelId: trim.modelId, isActive: true, photoLinks: { not: null } },
        select: { photoLinks: true },
        take: 1
      });
      for (const sib of siblingTrims) {
        try {
          if (sib.photoLinks) { trimPhotos = JSON.parse(sib.photoLinks); break; }
        } catch {}
      }
    }

    const primaryImage = resolveCatalogImageUrl({
      carPhotos: photos,
      makeName,
      rawModelName,
      modelName,
      trimPhotos,
      modelImageUrl: trim.model.imageUrl || null,
    });

    // Find incentives — deduplicate by name (keep LEASE version if both exist)
    const now = new Date();
    const allIncentives = await prisma.oemIncentiveProgram.findMany({
      where: {
        isActive: true,
        make: makeName,
        OR: [
          { model: modelName },
          { model: 'ALL' },
          { model: null }
        ]
      }
    });
    // Deduplicate: prefer LEASE applicability, then ALL, then FINANCE
    const seen = new Map<string, typeof allIncentives[0]>();
    for (const inc of allIncentives) {
      const existing = seen.get(inc.name);
      if (!existing) {
        seen.set(inc.name, inc);
      } else {
        // Prefer LEASE > ALL > FINANCE
        const priority = (a: string) => a === 'LEASE' ? 3 : a === 'ALL' ? 2 : 1;
        if (priority(inc.dealApplicability) > priority(existing.dealApplicability)) {
          seen.set(inc.name, inc);
        }
      }
    }
    const matchedIncentives = Array.from(seen.values());

    res.json({
      id: trim.id,
      make: makeName,
      model: modelName,
      trim: trim.name,
      year: (trim.model as any).years?.[0] || new Date().getFullYear(),
      msrpCents: trim.msrpCents,
      bodyStyle: (trim as any).bodyStyle || null,
      imageUrl: primaryImage,
      photos: trimPhotos.length > 0 ? trimPhotos : (detailPhoto ? [detailPhoto.imageUrl] : (primaryImage ? [primaryImage] : [])),
      baseMF: trim.baseMF,
      baseAPR: trim.baseAPR,
      rv36: trim.rv36,
      leaseCashCents: trim.leaseCashCents,
      incentives: matchedIncentives.map(i => ({
        id: i.id,
        name: i.name,
        amountCents: i.amountCents,
        type: i.type,
        dealApplicability: i.dealApplicability
      }))
    });
  } catch (error: any) {
    console.error('Catalog detail error:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch vehicle detail' });
  }
});

function applyFilters(entries: CatalogEntry[], filters: {
  make?: string; minPrice?: string; maxPrice?: string; bodyStyle?: string; sort?: string; limit?: string; mode?: string;
}): CatalogEntry[] {
  let result = getReadyCatalogEntries(entries);
  const paymentForMode = (entry: CatalogEntry) => filters.mode === 'finance'
    ? (entry.financePayment || 9999)
    : (entry.leasePayment || 9999);

  if (filters.make && filters.make !== 'All') {
    result = result.filter(e => e.make === filters.make);
  }
  if (filters.minPrice) {
    const min = parseFloat(filters.minPrice);
    result = result.filter(e => paymentForMode(e) >= min);
  }
  if (filters.maxPrice) {
    const max = parseFloat(filters.maxPrice);
    result = result.filter(e => paymentForMode(e) <= max);
  }
  if (filters.bodyStyle && filters.bodyStyle !== 'All') {
    result = result.filter(e => e.bodyStyle === filters.bodyStyle);
  }

  // Sort
  switch (filters.sort) {
    case 'payment':
      result.sort((a, b) => paymentForMode(a) - paymentForMode(b));
      break;
    case 'msrp':
      result.sort((a, b) => a.msrp - b.msrp);
      break;
    case 'savings':
      result.sort((a, b) => b.savings - a.savings);
      break;
    default:
      result.sort((a, b) => paymentForMode(a) - paymentForMode(b));
  }

  if (filters.limit) {
    result = result.slice(0, parseInt(filters.limit));
  }

  return result;
}

/**
 * PATCH /api/v2/catalog/:trimId/toggle
 * Toggle catalog visibility (isActive) for a trim
 */
router.patch('/:trimId/toggle', async (req, res) => {
  try {
    const { trimId } = req.params;
    const trim = await prisma.vehicleTrim.findUnique({ where: { id: trimId } });
    if (!trim) return res.status(404).json({ error: 'Trim not found' });

    const updated = await prisma.vehicleTrim.update({
      where: { id: trimId },
      data: { isActive: !trim.isActive }
    });

    // Clear catalog cache
    catalogCache.flushAll();

    res.json({ id: updated.id, isActive: updated.isActive });
  } catch (error: any) {
    console.error('Toggle error:', error);
    res.status(500).json({ error: error?.message || 'Failed to toggle' });
  }
});

export default router;
