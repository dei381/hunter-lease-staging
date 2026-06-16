/**
 * Hunter Score (MVP) — a single 0-100 deal-quality number for a lease card.
 *
 * No US lease competitor exposes one number; this is the core differentiator. The MVP
 * scores from data we already have on every card (payment, MSRP, and a real local
 * market average), with hard guardrails so we NEVER show a number we cannot stand behind
 * (a visibly broken score destroys trust faster than a hidden one).
 *
 * Two axes:
 *   - Market Delta (60%): how far below the local market the monthly payment is.
 *     Needs a REAL marketAvg; if absent we fall back to the LCR axis alone.
 *   - LCR / Lease Cost Ratio (40%): monthly payment as a percent of MSRP. An absolute,
 *     always-available value (the German "Leasingfaktor" idea), normalized to a 0-100 band.
 *
 * Guardrails -> status 'pending' (render no badge):
 *   - missing/invalid MSRP or payment
 *   - LCR below MIN_LCR_PERCENT (an implausibly low payment is almost always a data error,
 *     e.g. the broken IONIQ outliers at ~0.1-0.2% of MSRP)
 */

export type HunterBand = 'steal' | 'strong' | 'fair' | 'above_market';
export type HunterStatus = 'scored' | 'pending';
export type HunterMethod = 'market+lcr' | 'lcr' | 'none';

export interface HunterScoreInput {
  paymentMonthly: number;        // dollars, the lease monthly payment shown on the card
  msrp: number;                  // dollars, vehicle MSRP
  marketAvg?: number | null;     // dollars, REAL local market average monthly (null if synthetic/missing)
}

export interface HunterScoreResult {
  status: HunterStatus;
  score: number | null;          // 0-100, null when pending
  band: HunterBand | null;
  label: string;                 // band label, or 'Pending audit' when pending
  method: HunterMethod;
  lcrPercent: number | null;     // payment/msrp*100, surfaced for transparency
}

// A lease payment below ~0.6% of MSRP/mo is not a real deal, it is a data error.
export const MIN_LCR_PERCENT = 0.6;
// LCR band edges: <= BEST is excellent (axis 100), >= WORST is poor (axis 0).
export const LCR_BEST_PERCENT = 0.8;
export const LCR_WORST_PERCENT = 2.4;

function clamp(n: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, n));
}

/** LCR axis: linear 100 at LCR_BEST_PERCENT down to 0 at LCR_WORST_PERCENT. */
export function lcrAxis(lcrPercent: number): number {
  return clamp(((LCR_WORST_PERCENT - lcrPercent) / (LCR_WORST_PERCENT - LCR_BEST_PERCENT)) * 100);
}

/** Market axis: delta = (marketAvg - payment)/marketAvg. 0% -> 50, +20% below market -> 100, -20% -> 0. */
export function marketAxis(delta: number): number {
  return clamp(50 + delta * 250);
}

export function bandFor(score: number): { band: HunterBand; label: string } {
  if (score >= 85) return { band: 'steal', label: 'Hunter Verified Steal' };
  if (score >= 65) return { band: 'strong', label: 'Strong Deal' };
  if (score >= 50) return { band: 'fair', label: 'Fair Deal' };
  return { band: 'above_market', label: 'Above Market' };
}

function pending(lcrPercent: number | null = null): HunterScoreResult {
  return { status: 'pending', score: null, band: null, label: 'Pending audit', method: 'none', lcrPercent };
}

export function computeHunterScore(input: HunterScoreInput): HunterScoreResult {
  const payment = Number(input.paymentMonthly);
  const msrp = Number(input.msrp);

  if (!(payment > 0) || !(msrp > 0)) return pending();

  const lcrPercent = (payment / msrp) * 100;
  // Implausibly low payment relative to MSRP -> almost certainly a data error; never score it.
  if (lcrPercent < MIN_LCR_PERCENT) return pending(round2(lcrPercent));

  const lcr = lcrAxis(lcrPercent);

  const marketAvg = Number(input.marketAvg);
  const hasMarket = input.marketAvg != null && marketAvg > 0;

  let raw: number;
  let method: HunterMethod;
  if (hasMarket) {
    const delta = (marketAvg - payment) / marketAvg;
    raw = 0.6 * marketAxis(delta) + 0.4 * lcr;
    method = 'market+lcr';
  } else {
    raw = lcr;
    method = 'lcr';
  }

  const score = Math.round(clamp(raw));
  const { band, label } = bandFor(score);
  return { status: 'scored', score, band, label, method, lcrPercent: round2(lcrPercent) };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
