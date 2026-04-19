import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

export interface InventorySyncOptions {
  zip: string;
  radius: number;
  rows: number;
  priceMin: number;
  priceMax: number;
  milesMin: number;
  milesMax: number;
  domMin: number;
  domMax: number;
  dosMin: number;
  dosMax: number;
  yearMin: number;
  yearMax: number;
  vehicleStatus: string;
}

type InventoryFacetField = 'make' | 'model' | 'trim' | 'year';

export type InventoryPartitionFilters = Partial<Record<InventoryFacetField, string>>;

export interface InventoryPartition {
  filters: InventoryPartitionFilters;
  estimatedCount: number;
}

const DEFAULT_INVENTORY_SYNC_OPTIONS: InventorySyncOptions = {
  zip: '90001',
  radius: 50,
  rows: 50,
  priceMin: 15000,
  priceMax: 500000,
  milesMin: 0,
  milesMax: 10000,
  domMin: 0,
  domMax: 160,
  dosMin: 1,
  dosMax: 153,
  yearMin: 2023,
  yearMax: 2030,
  vehicleStatus: 'Available',
};

const MARKETCHECK_PACKAGE_PAGINATION_LIMIT = 1500;
const MARKETCHECK_FACET_LIMIT = 1000;
const INVENTORY_PARTITION_FIELDS: InventoryFacetField[] = ['make', 'model', 'trim', 'year'];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getApiKey(): string {
  const apiKey = (process.env.MARKETCHECK_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('MARKETCHECK_API_KEY is not configured');
  }
  return apiKey;
}

function ensureFirebaseAdmin() {
  if (admin.apps.length) return;

  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  const configPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    admin.initializeApp({ projectId: config.projectId });
    return;
  }

  admin.initializeApp();
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function matchesInventoryFilters(listing: any, options: InventorySyncOptions): boolean {
  const year = toNumber(listing.build?.year);
  const price = toNumber(listing.price || listing.msrp);
  const miles = toNumber(listing.miles);
  const dom = toNumber(listing.dom ?? listing.dom_active);
  const dos = toNumber(listing.dos_active ?? listing.days_on_site);
  const vehicleStatus = String(listing.vehicle_status || '').toLowerCase();

  if (options.vehicleStatus && vehicleStatus !== options.vehicleStatus.toLowerCase()) return false;
  if (listing.in_transit === true) return false;
  if (year < options.yearMin || year > options.yearMax) return false;
  if (price < options.priceMin || price > options.priceMax) return false;
  if (miles < options.milesMin || miles > options.milesMax) return false;
  if (dom < options.domMin || dom > options.domMax) return false;
  if (dos < options.dosMin || dos > options.dosMax) return false;

  return true;
}

function normalizePartitionValue(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const normalized = String(value).trim();
  return normalized ? normalized : undefined;
}

function describeInventoryPartition(filters: InventoryPartitionFilters): string {
  const parts = [filters.make, filters.model, filters.trim, filters.year].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : 'base search';
}

function buildInventorySearchUrl(
  apiKey: string,
  options: InventorySyncOptions,
  start: number,
  filters: InventoryPartitionFilters = {},
  overrides: { rows?: number; facets?: string } = {},
): string {
  const url = new URL('https://mc-api.marketcheck.com/v2/search/car/active');
  url.searchParams.set('api_key', apiKey);
  url.searchParams.set('car_type', 'new');
  url.searchParams.set('zip', options.zip);
  url.searchParams.set('radius', String(options.radius));
  url.searchParams.set('rows', String(overrides.rows ?? options.rows));
  url.searchParams.set('start', String(start));
  url.searchParams.set('price_range', `${options.priceMin}-${options.priceMax}`);
  url.searchParams.set('miles_range', `${options.milesMin}-${options.milesMax}`);
  url.searchParams.set('year_range', `${options.yearMin}-${options.yearMax}`);
  url.searchParams.set('dom_range', `${options.domMin}-${options.domMax}`);
  url.searchParams.set('dos_active_range', `${options.dosMin}-${options.dosMax}`);
  url.searchParams.set('vehicle_status', options.vehicleStatus);

  if (overrides.facets) {
    url.searchParams.set('facets', overrides.facets);
  }

  const make = normalizePartitionValue(filters.make);
  const model = normalizePartitionValue(filters.model);
  const trim = normalizePartitionValue(filters.trim);
  const year = normalizePartitionValue(filters.year);

  if (make) url.searchParams.set('make', make);
  if (model) url.searchParams.set('model', model);
  if (trim) url.searchParams.set('trim', trim);
  if (year) url.searchParams.set('year', year);

  return url.toString();
}

let lastApiCallTime = 0;
const API_CALL_MIN_INTERVAL_MS = 1200; // ~50 calls/min to stay under rate limit

async function fetchInventoryPayload(
  apiKey: string,
  options: InventorySyncOptions,
  start: number,
  filters: InventoryPartitionFilters = {},
  overrides: { rows?: number; facets?: string } = {},
) {
  // Rate limiting: ensure minimum interval between API calls
  const now = Date.now();
  const elapsed = now - lastApiCallTime;
  if (elapsed < API_CALL_MIN_INTERVAL_MS) {
    await sleep(API_CALL_MIN_INTERVAL_MS - elapsed);
  }
  lastApiCallTime = Date.now();

  const res = await fetch(buildInventorySearchUrl(apiKey, options, start, filters, overrides));

  if (!res.ok) {
    if (res.status === 429) {
      // Rate limited — wait and retry once
      console.warn('Marketcheck 429 rate limit hit, waiting 60s before retry...');
      await sleep(60000);
      lastApiCallTime = Date.now();
      const retryRes = await fetch(buildInventorySearchUrl(apiKey, options, start, filters, overrides));
      if (!retryRes.ok) {
        throw new Error(`Marketcheck API error: ${retryRes.status} ${await retryRes.text()}`);
      }
      return retryRes.json() as Promise<any>;
    }
    throw new Error(`Marketcheck API error: ${res.status} ${await res.text()}`);
  }

  return res.json() as Promise<any>;
}

async function fetchInventoryCount(
  apiKey: string,
  options: InventorySyncOptions,
  filters: InventoryPartitionFilters = {},
): Promise<number> {
  const data = await fetchInventoryPayload(apiKey, options, 0, filters, { rows: 0 });
  return typeof data.num_found === 'number' ? data.num_found : 0;
}

async function fetchFacetBuckets(
  apiKey: string,
  options: InventorySyncOptions,
  filters: InventoryPartitionFilters,
  field: InventoryFacetField,
): Promise<Array<{ value: string; count: number }>> {
  const data = await fetchInventoryPayload(apiKey, options, 0, filters, {
    rows: 0,
    facets: `${field}|0|${MARKETCHECK_FACET_LIMIT}|1`,
  });
  const rawBuckets = Array.isArray(data.facets?.[field]) ? data.facets[field] : [];

  return rawBuckets
    .map((bucket: any) => ({
      value: normalizePartitionValue(bucket?.item),
      count: toNumber(bucket?.count),
    }))
    .filter((bucket: { value?: string; count: number }): bucket is { value: string; count: number } => {
      return Boolean(bucket.value) && bucket.count > 0;
    });
}

async function resolveInventoryPartitions(
  apiKey: string,
  options: InventorySyncOptions,
  filters: InventoryPartitionFilters = {},
  knownCount?: number,
): Promise<InventoryPartition[]> {
  const estimatedCount = knownCount ?? await fetchInventoryCount(apiKey, options, filters);

  if (estimatedCount === 0) {
    return [];
  }

  if (estimatedCount <= MARKETCHECK_PACKAGE_PAGINATION_LIMIT) {
    return [{ filters, estimatedCount }];
  }

  const remainingFields = INVENTORY_PARTITION_FIELDS.filter((field) => !normalizePartitionValue(filters[field]));

  for (const field of remainingFields) {
    const buckets = await fetchFacetBuckets(apiKey, options, filters, field);
    if (buckets.length === 0) {
      continue;
    }

    // Allow small discrepancy between facet totals and estimated count
    // Marketcheck facet counts may not perfectly match num_found
    const bucketTotal = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
    if (Math.abs(bucketTotal - estimatedCount) > estimatedCount * 0.1 && bucketTotal < estimatedCount * 0.8) {
      continue;
    }

    const partitions: InventoryPartition[] = [];
    let failed = false;

    for (const bucket of buckets) {
      try {
        partitions.push(...await resolveInventoryPartitions(apiKey, options, {
          ...filters,
          [field]: bucket.value,
        }, bucket.count));
      } catch {
        failed = true;
        break;
      }
    }

    if (!failed) {
      // Accept partitions even if total doesn't exactly match (facet approximation)
      return partitions;
    }
  }

  throw new Error(
    `Unable to partition Marketcheck search under subscribed package pagination limit of ${MARKETCHECK_PACKAGE_PAGINATION_LIMIT} results for ${describeInventoryPartition(filters)}`
  );
}

export async function buildInventoryPartitions(
  apiKey: string,
  options: InventorySyncOptions,
): Promise<InventoryPartition[]> {
  return resolveInventoryPartitions(apiKey, options);
}

export class MarketcheckInventoryService {
  static async syncInventory(
    rawOptions: Partial<InventorySyncOptions> = {},
    onProgress?: (progress: number) => void,
  ) {
    const apiKey = getApiKey();
    const options: InventorySyncOptions = {
      ...DEFAULT_INVENTORY_SYNC_OPTIONS,
      ...rawOptions,
      rows: Math.max(1, Math.min(50, Number(rawOptions.rows || DEFAULT_INVENTORY_SYNC_OPTIONS.rows))),
    };

    console.log(`Starting Marketcheck inventory sync (${options.zip}, ${options.radius}mi, ${options.vehicleStatus})...`);
    try {
      ensureFirebaseAdmin();
      const db = admin.firestore();

      const partitions = await buildInventoryPartitions(apiKey, options);
      const totalAvailable = partitions.reduce((sum, partition) => sum + partition.estimatedCount, 0);
      let totalWritten = 0;
      let skipped = 0;
      let pagesFetched = 0;
      let processedAvailable = 0;

      onProgress?.(1);

      for (const partition of partitions) {
        let start = 0;

        while (true) {
          const data = await fetchInventoryPayload(apiKey, options, start, partition.filters);
          const listings = Array.isArray(data.listings) ? data.listings : [];
          const partitionCount = typeof data.num_found === 'number' ? data.num_found : partition.estimatedCount;

          if (partitionCount > MARKETCHECK_PACKAGE_PAGINATION_LIMIT) {
            throw new Error(
              `Marketcheck partition ${describeInventoryPartition(partition.filters)} still exceeds package pagination limit of ${MARKETCHECK_PACKAGE_PAGINATION_LIMIT}`
            );
          }

          if (listings.length === 0) {
            break;
          }

          pagesFetched += 1;
          let currentBatch = db.batch();
          let batchOps = 0;

          for (const listing of listings) {
            if (!matchesInventoryFilters(listing, options)) {
              skipped += 1;
              continue;
            }

            const processed = await this.processListing(listing, apiKey);
            const ref = db.collection('mc_inventory').doc(String(listing.id));
            currentBatch.set(ref, {
              ...processed,
              source: 'marketcheck',
              syncFilters: options,
              syncPartition: partition.filters,
              updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
            batchOps += 1;
            totalWritten += 1;

            if (batchOps === 500) {
              await currentBatch.commit();
              currentBatch = db.batch();
              batchOps = 0;
            }
          }

          if (batchOps > 0) {
            await currentBatch.commit();
          }

          start += listings.length;
          processedAvailable += listings.length;

          if (totalAvailable > 0) {
            onProgress?.(Math.max(1, Math.min(99, Math.round((processedAvailable / totalAvailable) * 100))));
          }

          console.log(
            `Marketcheck inventory sync page ${pagesFetched} (${describeInventoryPartition(partition.filters)}): wrote ${totalWritten}/${totalAvailable || '?'} listings`
          );

          if (start >= partitionCount) {
            break;
          }

          await sleep(100);
        }
      }

      onProgress?.(100);
      console.log('Marketcheck inventory sync completed successfully');
      return {
        success: true,
        count: totalWritten,
        numFound: totalAvailable,
        pagesFetched,
        skipped,
        partitionCount: partitions.length,
        options,
      };
    } catch (error) {
      console.error('Error in Marketcheck inventory sync:', error);
      throw error;
    }
  }

  static async processListing(listing: any, apiKey = getApiKey()) {
    let msrp = listing.msrp;

    // If MSRP is missing, try to get it from the detail API
    if (!msrp || msrp === 0) {
      try {
        // Small delay to avoid aggressive rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        const detailRes = await fetch(
          `https://mc-api.marketcheck.com/v2/listing/car/${listing.id}?api_key=${apiKey}`
        );
        if (detailRes.ok) {
          const data: any = await detailRes.json();
          msrp = data.msrp;
        }
      } catch (e) {
        console.error(`Error fetching detail for listing ${listing.id}:`, e);
      }
    }

    // If still no MSRP, mark as pending_review
    const status = (!msrp || msrp === 0)
      ? 'pending_review'
      : 'active';

    return { ...listing, msrp, status };
  }

  static async syncIncentives(make: string, year: number, zip: string = '90210') {
    console.log(`Syncing incentives for ${make} ${year} in ${zip}...`);
    try {
      const apiKey = getApiKey();
      ensureFirebaseAdmin();
      const oem = make.toLowerCase();
      const res = await fetch(
        `https://mc-api.marketcheck.com/v2/search/car/incentive/${oem}/${zip}?api_key=${apiKey}`
      );

      if (!res.ok) {
        console.warn(`Marketcheck Incentives API error for ${oem}: ${res.status}`);
        return null;
      }

      const data: any = await res.json();
      const incentives = data.incentives || [];

      const db = admin.firestore();
      // Use a consistent key: make_zip (since incentives are regional)
      const docId = `${make.toLowerCase()}_${zip}`;
      await db.collection('mc_incentives').doc(docId).set({
        incentives,
        make,
        zip,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return incentives;
    } catch (error) {
      console.error('Error in Marketcheck incentives sync:', error);
      return null;
    }
  }
}
