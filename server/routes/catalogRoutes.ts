import express from 'express';
import prisma from '../lib/db';
import NodeCache from 'node-cache';
import { PureMathEngine } from '../services/engine/PureMathEngine';
import { findCatalogPhotoRecord, resolveCatalogImageUrl } from '../utils/catalogImage';

const router = express.Router();
const catalogCache = new NodeCache({ stdTTL: 300 }); // 5 min cache

// Target brands — only these appear in the catalog
const TARGET_BRANDS = [
  'Acura', 'Chevrolet', 'Ford', 'Genesis', 'Hyundai',
  'Kia', 'Lexus', 'Ram', 'Toyota', 'Volvo'
];

// Minimum MSRP threshold (cents) — filter out bad MarketCheck data (used cars, wrong prices)
const MIN_MSRP_CENTS = 1800000; // $18,000

interface CatalogEntry {
  id: string;
  make: string;
  model: string;
  trim: string;
  year: number;
  msrp: number;
  bodyStyle: string | null;
  imageUrl: string | null;
  // Lease calc
  leasePayment: number | null;
  leaseTerm: number;
  leaseMileage: number;
  leaseDown: number;
  leaseMF: number;
  leaseRV: number;
  // Finance calc
  financePayment: number | null;
  financeTerm: number;
  financeAPR: number;
  financeDown: number;
  // Incentives
  totalIncentivesCents: number;
  incentives: { name: string; amountCents: number; type: string }[];
  // Computed
  sellingPrice: number;
  savings: number;
  status: 'ready' | 'incomplete';
  missingFields: string[];
  // Program info
  lenderName: string | null;
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
      down: qDown, mileage: qMileage, tier: qTier, limit: qLimit
    } = req.query;

    const requestedTerm = parseInt(qTerm as string) || 36;
    const requestedDown = parseInt(qDown as string) || 0;
    const requestedMileage = parseInt(qMileage as string) || 10000;
    const downCents = requestedDown * 100;

    // Cache key based on params
    const cacheKey = `catalog_${make || 'all'}_${requestedTerm}_${requestedDown}_${requestedMileage}_${qTier || 't1'}`;
    const cached = catalogCache.get<CatalogEntry[]>(cacheKey);
    if (cached) {
      const filtered = applyFilters(cached, { make: make as string, minPrice: minPrice as string, maxPrice: maxPrice as string, bodyStyle: bodyStyle as string, sort: sort as string, limit: qLimit as string });
      return res.json(filtered);
    }

    // 1. Fetch all active trims with their model and make (filtered to target brands + min MSRP)
    const trims = await prisma.vehicleTrim.findMany({
      where: {
        isActive: true,
        msrpCents: { gte: MIN_MSRP_CENTS },
        model: { isActive: true, make: { isActive: true, name: { in: TARGET_BRANDS } } }
      },
      include: {
        model: { include: { make: true } }
      }
    });

    // 2. Fetch active bank programs (from active batch)
    const activeBatch = await prisma.programBatch.findFirst({
      where: { status: 'ACTIVE' },
      orderBy: { publishedAt: 'desc' }
    });

    let bankPrograms: any[] = [];
    if (activeBatch) {
      bankPrograms = await prisma.bankProgram.findMany({
        where: { batchId: activeBatch.id },
        include: { lender: true }
      });
    }

    // Also fetch LeaseProgram and FinanceProgram
    const [leasePrograms, financePrograms] = await Promise.all([
      prisma.leaseProgram.findMany({ where: { isActive: true }, include: { lender: true } }),
      prisma.financeProgram.findMany({ where: { isActive: true }, include: { lender: true } })
    ]);

    // 2b. Fetch car photos
    const photosRecord = await prisma.siteSettings.findUnique({ where: { id: 'car_photos' } });
    const carPhotos: any[] = photosRecord?.data ? JSON.parse(photosRecord.data) : [];
    console.log(`[Catalog] Loaded ${carPhotos.length} car photos`);

    // 3. Fetch active incentives
    const now = new Date();
    const incentives = await prisma.oemIncentiveProgram.findMany({
      where: {
        isActive: true,
        OR: [
          { effectiveFrom: null },
          { effectiveFrom: { lte: now } }
        ]
      }
    });

    // 4. Fetch settings for fees
    const settingsRecord = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    let settings: any = { brokerFee: 595, taxRateDefault: 8.875, dmvFee: 400, docFee: 85, acquisitionFee: 650 };
    try {
      if (settingsRecord?.data) settings = JSON.parse(settingsRecord.data);
    } catch {}

    const taxRate = (settings.taxRateDefault || 8.875) / 100;
    const docFeeCents = (settings.docFee || 85) * 100;
    const dmvFeeCents = (settings.dmvFee || 400) * 100;
    const acqFeeCents = (settings.acquisitionFee || 650) * 100;
    const brokerFeeCents = (settings.brokerFee || 595) * 100;

    // 5. Build catalog entries
    const entries: CatalogEntry[] = [];

    for (const trim of trims) {
      const makeName = trim.model.make.name;
      // Strip brand prefix from model name (e.g. "Ram 1500 Pickup" → "1500 Pickup" for make "Ram")
      const rawModelName = trim.model.name;
      const modelName = rawModelName.startsWith(makeName + ' ') ? rawModelName.slice(makeName.length + 1) : rawModelName;
      const trimName = trim.name;
      const msrpCents = trim.msrpCents;
      const year = (trim.model as any).years?.[0] || new Date().getFullYear();

      const missingFields: string[] = [];

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

      // Find best lease program
      let leaseMF = trim.baseMF || 0;
      let leaseRV = trim.rv36 || 0;
      let lenderName: string | null = null;

      // Try BankProgram first (from active batch)
      const bankProg = bankPrograms.find(p =>
        p.programType === 'LEASE' &&
        p.make === makeName &&
        (p.model === modelName || p.model === 'ALL' || p.model === '') &&
        (p.year === year || p.year === 0) &&
        p.term === requestedTerm
      );

      if (bankProg) {
        if (bankProg.mf) leaseMF = bankProg.mf;
        if (bankProg.rv) leaseRV = bankProg.rv;
        lenderName = bankProg.lender?.name || null;
      }

      // Try LeaseProgram table
      if (!leaseMF || !leaseRV) {
        const leaseProg = leasePrograms.find(p =>
          p.make === makeName &&
          (p.model === modelName || p.model === 'ALL') &&
          (p.year === year || p.year === 0) &&
          p.term === requestedTerm
        );
        if (leaseProg) {
          if (!leaseMF && leaseProg.buyRateMf) leaseMF = Number(leaseProg.buyRateMf);
          if (!leaseRV && leaseProg.residualPercentage) leaseRV = Number(leaseProg.residualPercentage);
          if (!lenderName) lenderName = leaseProg.lender?.name || null;
        }
      }

      // Fall back to trim-level data
      if (!leaseMF) leaseMF = trim.baseMF || 0;
      if (!leaseRV) leaseRV = trim.rv36 || 0;

      if (!leaseMF) missingFields.push('moneyFactor');
      if (!leaseRV) missingFields.push('residualValue');

      // Find matching incentives
      const matchedIncentives = incentives.filter(inc =>
        inc.make === makeName &&
        (!inc.model || inc.model === modelName || inc.model === 'ALL') &&
        (!inc.trim || inc.trim === trimName || inc.trim === 'ALL') &&
        (inc.dealApplicability === 'ALL' || inc.dealApplicability === 'LEASE')
      );
      const totalIncentivesCents = matchedIncentives.reduce((sum, inc) => sum + inc.amountCents, 0);
      const sellingPriceCents = msrpCents - totalIncentivesCents;

      // Calculate lease payment
      let leasePaymentCents: number | null = null;
      if (leaseMF > 0 && leaseRV > 0) {
        try {
          const result = PureMathEngine.calculateLease({
            msrpCents,
            sellingPriceCents,
            residualValuePercent: leaseRV,
            moneyFactor: leaseMF,
            term: requestedTerm,
            downPaymentCents: downCents,
            acqFeeCents,
            docFeeCents,
            dmvFeeCents,
            brokerFeeCents,
            taxRate
          });
          leasePaymentCents = result.finalPaymentCents;
        } catch {
          // Calculation failed
        }
      }

      // Find finance program
      let financeAPR = trim.baseAPR || 0;
      const financeProg = bankPrograms.find(p =>
        p.programType === 'FINANCE' &&
        p.make === makeName &&
        (p.model === modelName || p.model === 'ALL' || p.model === '') &&
        (p.year === year || p.year === 0) &&
        p.term === requestedTerm
      ) || financePrograms.find(p =>
        p.make === makeName &&
        (p.model === modelName || p.model === 'ALL') &&
        (p.year === year || p.year === 0) &&
        p.term === requestedTerm
      );

      if (financeProg) {
        financeAPR = Number((financeProg as any).apr || (financeProg as any).buyRateApr || 0);
        if (!lenderName) lenderName = (financeProg as any).lender?.name || null;
      }

      if (!financeAPR) financeAPR = trim.baseAPR || 0;

      // Calculate finance payment
      let financePaymentCents: number | null = null;
      if (financeAPR > 0) {
        try {
          const result = PureMathEngine.calculateFinance({
            sellingPriceCents,
            totalIncentivesCents: 0,
            apr: financeAPR,
            term: requestedTerm,
            downPaymentCents: downCents,
            docFeeCents,
            dmvFeeCents,
            brokerFeeCents,
            taxRate
          });
          financePaymentCents = result.finalPaymentCents;
        } catch {
          // Calculation failed
        }
      }

      // Status: ready only if has MSRP + at least one valid calculation
      const hasCalculation = leasePaymentCents !== null || financePaymentCents !== null;
      const status = hasCalculation ? 'ready' : 'incomplete';

      entries.push({
        id: trim.id,
        make: makeName,
        model: modelName,
        trim: trimName,
        year,
        msrp: msrpCents / 100,
        bodyStyle: (trim as any).bodyStyle || null,
        imageUrl: photoUrl || trim.model.imageUrl || null,
        leasePayment: leasePaymentCents ? leasePaymentCents / 100 : null,
        leaseTerm: requestedTerm,
        leaseMileage: requestedMileage,
        leaseDown: requestedDown,
        leaseMF: leaseMF,
        leaseRV: leaseRV,
        financePayment: financePaymentCents ? financePaymentCents / 100 : null,
        financeTerm: requestedTerm,
        financeAPR: financeAPR,
        financeDown: requestedDown,
        totalIncentivesCents,
        incentives: matchedIncentives.map(i => ({ name: i.name, amountCents: i.amountCents, type: i.type })),
        sellingPrice: sellingPriceCents / 100,
        savings: totalIncentivesCents / 100,
        status,
        missingFields,
        lenderName
      });
    }

    // Cache full result
    catalogCache.set(cacheKey, entries);

    // Apply filters and return
    const filtered = applyFilters(entries, { make: make as string, minPrice: minPrice as string, maxPrice: maxPrice as string, bodyStyle: bodyStyle as string, sort: sort as string, limit: qLimit as string });
    res.json(filtered);
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
  make?: string; minPrice?: string; maxPrice?: string; bodyStyle?: string; sort?: string; limit?: string;
}): CatalogEntry[] {
  let result = entries.filter(e => e.status === 'ready' && e.imageUrl && e.imageUrl.startsWith('http'));

  if (filters.make && filters.make !== 'All') {
    result = result.filter(e => e.make === filters.make);
  }
  if (filters.minPrice) {
    const min = parseFloat(filters.minPrice);
    result = result.filter(e => (e.leasePayment || 0) >= min);
  }
  if (filters.maxPrice) {
    const max = parseFloat(filters.maxPrice);
    result = result.filter(e => (e.leasePayment || 0) <= max);
  }
  if (filters.bodyStyle && filters.bodyStyle !== 'All') {
    result = result.filter(e => e.bodyStyle === filters.bodyStyle);
  }

  // Sort
  switch (filters.sort) {
    case 'payment':
      result.sort((a, b) => (a.leasePayment || 9999) - (b.leasePayment || 9999));
      break;
    case 'msrp':
      result.sort((a, b) => a.msrp - b.msrp);
      break;
    case 'savings':
      result.sort((a, b) => b.savings - a.savings);
      break;
    default:
      result.sort((a, b) => (a.leasePayment || 9999) - (b.leasePayment || 9999));
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
