import { describe, expect, it } from 'vitest';

import { getDefaultLeaseMileage } from './defaultLeaseMileage';

describe('getDefaultLeaseMileage', () => {
  it('defaults Toyota leases to 10k to match OEM offer mileage buckets', () => {
    expect(getDefaultLeaseMileage('Toyota')).toBe('10k');
  });

  it('keeps Kia and Hyundai at 10k', () => {
    expect(getDefaultLeaseMileage('Kia')).toBe('10k');
    expect(getDefaultLeaseMileage('Hyundai')).toBe('10k');
  });

  it('keeps other makes at 7.5k', () => {
    expect(getDefaultLeaseMileage('BMW')).toBe('7.5k');
    expect(getDefaultLeaseMileage(undefined)).toBe('7.5k');
  });
});