import { describe, it, expect } from 'vitest';
import { computeHunterScore } from './HunterScore';

describe('computeHunterScore (MVP)', () => {
  it('scores a strong below-market deal as a Steal', () => {
    // $400/mo on a $40k car (LCR 1.0%), market $480 -> well below market
    const r = computeHunterScore({ paymentMonthly: 400, msrp: 40000, marketAvg: 480 });
    expect(r.status).toBe('scored');
    expect(r.method).toBe('market+lcr');
    expect(r.score).toBe(90);
    expect(r.band).toBe('steal');
    expect(r.lcrPercent).toBe(1);
  });

  it('scores a market-median deal as Fair', () => {
    // LCR 1.42% (catalog median), only slightly below market
    const r = computeHunterScore({ paymentMonthly: 568, msrp: 40000, marketAvg: 600 });
    expect(r.status).toBe('scored');
    expect(r.score).toBe(63);
    expect(r.band).toBe('fair');
  });

  it('scores an above-market deal below 50', () => {
    const r = computeHunterScore({ paymentMonthly: 700, msrp: 40000, marketAvg: 600 });
    expect(r.status).toBe('scored');
    expect(r.score).toBeLessThan(50);
    expect(r.band).toBe('above_market');
  });

  it('GUARDRAIL: an implausibly low payment (broken outlier) is pending, not a fake high score', () => {
    // IONIQ-style outlier: $46/mo on a $62k car -> LCR ~0.07%
    const r = computeHunterScore({ paymentMonthly: 46, msrp: 62000, marketAvg: 800 });
    expect(r.status).toBe('pending');
    expect(r.score).toBeNull();
    expect(r.band).toBeNull();
  });

  it('GUARDRAIL: missing/invalid MSRP is pending', () => {
    expect(computeHunterScore({ paymentMonthly: 400, msrp: 0, marketAvg: 480 }).status).toBe('pending');
    expect(computeHunterScore({ paymentMonthly: 0, msrp: 40000, marketAvg: 480 }).status).toBe('pending');
  });

  it('falls back to the LCR axis alone when no real market average exists', () => {
    const r = computeHunterScore({ paymentMonthly: 400, msrp: 40000, marketAvg: null });
    expect(r.status).toBe('scored');
    expect(r.method).toBe('lcr');
    expect(r.score).toBe(88); // LCR 1.0% -> axis 87.5 -> round 88
    expect(r.band).toBe('steal');
  });

  it('clamps the score to 0-100 for extreme inputs', () => {
    // 0.8% LCR (axis 100) and 60% below market (axis clamps to 100)
    const r = computeHunterScore({ paymentMonthly: 320, msrp: 40000, marketAvg: 800 });
    expect(r.score).toBe(100);
    expect(r.band).toBe('steal');
  });
});
