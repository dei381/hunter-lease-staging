import { describe, expect, it, vi } from 'vitest';

import { createAsyncTtlCache } from '../utils/asyncTtlCache';
import { getDisplayedSellingPrice, getVehicleCostSummary } from '../../src/utils/vehicleCostSummary';

describe('createAsyncTtlCache', () => {
  it('reuses a resolved value until the ttl expires', async () => {
    let now = 1_000;
    let loads = 0;
    const cache = createAsyncTtlCache<string>({ ttlMs: 500, now: () => now });

    const first = await cache.getOrLoad('catalog', async () => {
      loads += 1;
      return 'first-build';
    });

    const second = await cache.getOrLoad('catalog', async () => {
      loads += 1;
      return 'second-build';
    });

    now += 501;

    const third = await cache.getOrLoad('catalog', async () => {
      loads += 1;
      return 'third-build';
    });

    expect(first).toBe('first-build');
    expect(second).toBe('first-build');
    expect(third).toBe('third-build');
    expect(loads).toBe(2);
  });

  it('coalesces concurrent loads for the same key', async () => {
    const cache = createAsyncTtlCache<number>({ ttlMs: 1_000 });
    let resolveLoader: ((value: number) => void) | null = null;
    const loader = vi.fn(() => new Promise<number>(resolve => {
      resolveLoader = resolve;
    }));

    const first = cache.getOrLoad('catalog', loader);
    const second = cache.getOrLoad('catalog', loader);

    expect(loader).toHaveBeenCalledTimes(1);
    resolveLoader?.(42);

    await expect(Promise.all([first, second])).resolves.toEqual([42, 42]);
  });
});

describe('getVehicleCostSummary', () => {
  it('uses live quote tco values when they are available', () => {
    expect(getVehicleCostSummary({
      msrp: 42000,
      selectedConfig: {
        payment: 489.48,
        down: 3000,
        term: '36 mo',
        tco: {
          monthlyAverage: 612.34,
          totalCost: 22044.24,
        },
      },
    })).toEqual({
      monthlyAverage: 612.34,
      totalCost: 22044.24,
      termMonths: 36,
      down: 3000,
    });
  });

  it('falls back to the current calculator payment with the selected term and down payment', () => {
    expect(getVehicleCostSummary({
      msrp: 42000,
      selectedConfig: {
        payment: 450,
        down: 6000,
        term: '48 mo',
      },
    })).toEqual({
      monthlyAverage: 575,
      totalCost: 27600,
      termMonths: 48,
      down: 6000,
    });
  });
});

describe('getDisplayedSellingPrice', () => {
  it('shows the price after incentives when incentives are enabled', () => {
    expect(getDisplayedSellingPrice({
      quoteSellingPrice: 37372,
      totalIncentives: 1500,
      showIncentives: true,
    })).toBe(35872);
  });

  it('keeps the raw selling price when incentives are hidden', () => {
    expect(getDisplayedSellingPrice({
      quoteSellingPrice: 37372,
      totalIncentives: 1500,
      showIncentives: false,
    })).toBe(37372);
  });
});