import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => {
  const docSet = vi.fn();
  const doc = vi.fn(() => ({ set: docSet }));
  const collection = vi.fn(() => ({ doc }));
  const batchSet = vi.fn();
  const batchCommit = vi.fn().mockResolvedValue(undefined);
  const batch = vi.fn(() => ({ set: batchSet, commit: batchCommit }));
  const firestoreDb = { collection, batch };
  const firestore = vi.fn(() => firestoreDb) as any;
  firestore.FieldValue = { serverTimestamp: vi.fn(() => 'serverTimestamp') };

  return {
    docSet,
    doc,
    collection,
    batchSet,
    batchCommit,
    batch,
    firestoreDb,
    firestore,
    adminMock: {
      apps: [],
      initializeApp: vi.fn(),
      credential: { cert: vi.fn() },
      firestore,
    },
  };
});

vi.mock('firebase-admin', () => ({
  default: mocks.adminMock,
}));

import { buildInventoryPartitions, MarketcheckInventoryService } from '../services/MarketcheckInventoryService';

describe('MarketcheckInventoryService inventory sync', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    process.env.MARKETCHECK_API_KEY = 'test-marketcheck-key';
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.MARKETCHECK_API_KEY;
  });

  it('partitions oversized searches into subqueries that stay under the package limit', async () => {
    const fetchMock = vi.fn((input: string) => {
      const url = new URL(input);
      const facets = url.searchParams.get('facets');
      const make = url.searchParams.get('make');
      const model = url.searchParams.get('model');

      if (!facets && !make && !model && url.searchParams.get('rows') === '0') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ num_found: 2000, listings: [] }),
        });
      }

      if (facets === 'make|0|1000|1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            facets: {
              make: [
                { item: 'Toyota', count: 1600 },
                { item: 'Ford', count: 400 },
              ],
            },
          }),
        });
      }

      if (make === 'Toyota' && facets === 'model|0|1000|1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            facets: {
              model: [
                { item: 'Tacoma', count: 1600 },
              ],
            },
          }),
        });
      }

      if (make === 'Toyota' && model === 'Tacoma' && facets === 'trim|0|1000|1') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            facets: {
              trim: [
                { item: 'SR5', count: 900 },
                { item: 'TRD Sport', count: 700 },
              ],
            },
          }),
        });
      }

      throw new Error(`Unexpected Marketcheck request: ${url.toString()}`);
    });

    vi.stubGlobal('fetch', fetchMock);

    const partitions = await buildInventoryPartitions('test-marketcheck-key', {
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
    });

    expect(partitions).toEqual([
      { filters: { make: 'Toyota', model: 'Tacoma', trim: 'SR5' }, estimatedCount: 900 },
      { filters: { make: 'Toyota', model: 'Tacoma', trim: 'TRD Sport' }, estimatedCount: 700 },
      { filters: { make: 'Ford' }, estimatedCount: 400 },
    ]);
  });

  it('paginates with 90001 plus 50 mile filters and writes all available listings', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          num_found: 3,
          listings: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          num_found: 3,
          listings: [
            {
              id: 'listing-1',
              price: 35000,
              msrp: 35000,
              miles: 10,
              dom: 12,
              dos_active: 12,
              vehicle_status: 'Available',
              in_transit: false,
              build: { year: 2026, make: 'Toyota', model: 'Camry', trim: 'SE' },
              dealer: { zip: '90001' },
              media: { photo_links: ['https://images.example.com/1.jpg'] },
            },
            {
              id: 'listing-2',
              price: 42000,
              msrp: 42000,
              miles: 5,
              dom: 30,
              dos_active: 30,
              vehicle_status: 'Available',
              in_transit: false,
              build: { year: 2025, make: 'BMW', model: 'X3', trim: 'xDrive30i' },
              dealer: { zip: '90002' },
              media: { photo_links: ['https://images.example.com/2.jpg'] },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          num_found: 3,
          listings: [
            {
              id: 'listing-3',
              price: 50000,
              msrp: 50000,
              miles: 0,
              dom: 9,
              dos_active: 9,
              vehicle_status: 'Available',
              in_transit: false,
              build: { year: 2024, make: 'Audi', model: 'Q5', trim: 'Premium Plus' },
              dealer: { zip: '90003' },
              media: { photo_links: ['https://images.example.com/3.jpg'] },
            },
          ],
        }),
      });

    vi.stubGlobal('fetch', fetchMock);

    const result = await MarketcheckInventoryService.syncInventory({ rows: 2 });

    expect(result).toMatchObject({ success: true, count: 3, pagesFetched: 2, numFound: 3 });
  expect(fetchMock).toHaveBeenCalledTimes(3);

  const countUrl = new URL(fetchMock.mock.calls[0][0]);
  expect(countUrl.searchParams.get('rows')).toBe('0');

  const firstUrl = new URL(fetchMock.mock.calls[1][0]);
    expect(firstUrl.searchParams.get('zip')).toBe('90001');
    expect(firstUrl.searchParams.get('radius')).toBe('50');
    expect(firstUrl.searchParams.get('vehicle_status')).toBe('Available');
    expect(firstUrl.searchParams.get('price_range')).toBe('15000-500000');
    expect(firstUrl.searchParams.get('miles_range')).toBe('0-10000');
    expect(firstUrl.searchParams.get('year_range')).toBe('2023-2030');
    expect(firstUrl.searchParams.get('dom_range')).toBe('0-160');
    expect(firstUrl.searchParams.get('dos_active_range')).toBe('1-153');

    const secondUrl = new URL(fetchMock.mock.calls[2][0]);
    expect(secondUrl.searchParams.get('start')).toBe('2');

    expect(mocks.batchSet).toHaveBeenCalledTimes(3);
    expect(mocks.batchCommit).toHaveBeenCalledTimes(2);
  });

  it('drops listings that fall outside the requested ranges even if the API returns them', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          num_found: 2,
          listings: [],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          num_found: 2,
          listings: [
            {
              id: 'valid-listing',
              price: 25000,
              msrp: 25000,
              miles: 100,
              dom: 20,
              dos_active: 20,
              vehicle_status: 'Available',
              in_transit: false,
              build: { year: 2026, make: 'Toyota', model: 'Corolla', trim: 'LE' },
              dealer: { zip: '90001' },
              media: { photo_links: ['https://images.example.com/corolla.jpg'] },
            },
            {
              id: 'invalid-listing',
              price: 12000,
              msrp: 12000,
              miles: 15000,
              dom: 200,
              dos_active: 200,
              vehicle_status: 'In Transit',
              in_transit: true,
              build: { year: 2022, make: 'Toyota', model: 'Corolla', trim: 'L' },
              dealer: { zip: '90001' },
              media: { photo_links: ['https://images.example.com/bad.jpg'] },
            },
          ],
        }),
      }));

    const result = await MarketcheckInventoryService.syncInventory({ rows: 50 });

    expect(result).toMatchObject({ success: true, count: 1, skipped: 1 });
    expect(mocks.batchSet).toHaveBeenCalledTimes(1);
  });
});