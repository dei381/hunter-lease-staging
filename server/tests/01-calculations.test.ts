/**
 * TEST SUITE 1: Calculation Engine (PureMathEngine + EligibilityEngine)
 * 
 * Verifies:
 * - Lease payment math (depreciation + rent charge + tax)
 * - Finance payment math (amortized loan)
 * - First-time buyer eligibility logic
 * - Standard buyer eligibility
 * - MF markup detection (dealer protection)
 * - Consistent results across different inputs
 */

import { describe, it, expect } from 'vitest';
import { PureMathEngine } from '../services/engine/PureMathEngine';
import { EligibilityEngine } from '../services/EligibilityEngine';
import { FinancialData } from '../../src/types/engine';

// ─── LEASE MATH TESTS ────────────────────────────────────────────────────────

describe('PureMathEngine — Lease Calculations', () => {

  const baseLeaseParams = {
    msrpCents: 4500000,         // $45,000 MSRP
    sellingPriceCents: 4320000, // $43,200 (4% off)
    residualValuePercent: 0.55, // 55% residual
    moneyFactor: 0.00125,       // MF (equiv. ~3% APR)
    term: 36,
    downPaymentCents: 0,
    acqFeeCents: 89500,         // $895 acquisition fee
    docFeeCents: 8500,          // $85 doc fee
    dmvFeeCents: 45000,         // $450 DMV
    brokerFeeCents: 59500,      // $595 broker fee
    taxRate: 0.08875,           // 8.875% NY tax
  };

  it('should calculate correct monthly lease payment for $45k car', () => {
    const result = PureMathEngine.calculateLease(baseLeaseParams);
    
    expect(result.finalPaymentCents).toBeGreaterThan(0);
    expect(result.finalPaymentCents).toBeLessThan(200000); // < $2000/mo sanity check
    expect(result.residualValueCents).toBe(2475000); // 55% of $45k
    expect(result.depreciationCents).toBeGreaterThan(0);
    expect(result.rentChargeCents).toBeGreaterThan(0);
  });

  it('should produce lower payment with higher down payment', () => {
    const noDown = PureMathEngine.calculateLease({ ...baseLeaseParams, downPaymentCents: 0 });
    const withDown = PureMathEngine.calculateLease({ ...baseLeaseParams, downPaymentCents: 300000 }); // $3k down

    expect(withDown.finalPaymentCents).toBeLessThan(noDown.finalPaymentCents);
  });

  it('should produce lower payment with higher residual value', () => {
    const low = PureMathEngine.calculateLease({ ...baseLeaseParams, residualValuePercent: 0.45 });
    const high = PureMathEngine.calculateLease({ ...baseLeaseParams, residualValuePercent: 0.60 });

    expect(high.finalPaymentCents).toBeLessThan(low.finalPaymentCents);
  });

  it('should produce lower payment with lower money factor', () => {
    const highMF = PureMathEngine.calculateLease({ ...baseLeaseParams, moneyFactor: 0.00300 });
    const lowMF  = PureMathEngine.calculateLease({ ...baseLeaseParams, moneyFactor: 0.00050 });

    expect(lowMF.finalPaymentCents).toBeLessThan(highMF.finalPaymentCents);
  });

  it('should throw MATH_ERROR on invalid inputs', () => {
    expect(() =>
      PureMathEngine.calculateLease({ ...baseLeaseParams, term: 0 })
    ).toThrow('MATH_ERROR');
  });

  it('should produce deterministic results (same input = same output)', () => {
    const r1 = PureMathEngine.calculateLease(baseLeaseParams);
    const r2 = PureMathEngine.calculateLease(baseLeaseParams);

    expect(r1.finalPaymentCents).toBe(r2.finalPaymentCents);
  });

  it('should correctly calculate cap cost (selling price + acq fee - down)', () => {
    const result = PureMathEngine.calculateLease(baseLeaseParams);
    const expectedCapCost = baseLeaseParams.sellingPriceCents + baseLeaseParams.acqFeeCents - baseLeaseParams.downPaymentCents;
    
    expect(result.capCostCents).toBe(expectedCapCost);
  });
});

// ─── FINANCE MATH TESTS ──────────────────────────────────────────────────────

describe('PureMathEngine — Finance Calculations', () => {

  const baseFinanceParams = {
    sellingPriceCents: 3200000, // $32,000
    totalIncentivesCents: 50000, // $500 rebate
    apr: 5.9,
    term: 60,
    downPaymentCents: 500000,   // $5,000 down
    docFeeCents: 8500,
    dmvFeeCents: 45000,
    brokerFeeCents: 59500,
    taxRate: 0.08875,
  };

  it('should calculate correct monthly finance payment', () => {
    const result = PureMathEngine.calculateFinance(baseFinanceParams);

    expect(result.finalPaymentCents).toBeGreaterThan(0);
    expect(result.finalPaymentCents).toBeLessThan(150000); // < $1500/mo
    expect(result.principalCents).toBeGreaterThan(0);
  });

  it('should produce lower payment with lower APR', () => {
    const high = PureMathEngine.calculateFinance({ ...baseFinanceParams, apr: 9.9 });
    const low  = PureMathEngine.calculateFinance({ ...baseFinanceParams, apr: 2.9 });

    expect(low.finalPaymentCents).toBeLessThan(high.finalPaymentCents);
  });

  it('should produce lower payment with longer term', () => {
    const short = PureMathEngine.calculateFinance({ ...baseFinanceParams, term: 36 });
    const long  = PureMathEngine.calculateFinance({ ...baseFinanceParams, term: 72 });

    expect(long.finalPaymentCents).toBeLessThan(short.finalPaymentCents);
  });

  it('should handle 0% APR correctly (no interest)', () => {
    const result = PureMathEngine.calculateFinance({ ...baseFinanceParams, apr: 0 });
    
    expect(result.finalPaymentCents).toBeGreaterThan(0);
    // At 0% APR, monthly = principal / term
    const expectedPayment = Math.round(result.principalCents / baseFinanceParams.term);
    expect(result.finalPaymentCents).toBe(expectedPayment);
  });

  it('should produce deterministic results', () => {
    const r1 = PureMathEngine.calculateFinance(baseFinanceParams);
    const r2 = PureMathEngine.calculateFinance(baseFinanceParams);

    expect(r1.finalPaymentCents).toBe(r2.finalPaymentCents);
    expect(r1.principalCents).toBe(r2.principalCents);
  });
});

// ─── ELIGIBILITY TESTS ───────────────────────────────────────────────────────

describe('EligibilityEngine — Publishability & Buyer Logic', () => {

  const baseData: FinancialData = {
    make: 'BMW',
    model: '3 Series',
    trim: '330i',
    msrp: { value: 45000, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    salePrice: { value: 43200, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    residualValue: { value: 0.55, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    moneyFactor: { value: 0.00125, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    term: { value: 36, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    docFee: { value: 85, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    dmvFee: { value: 450, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    taxMonthly: { value: 0.08875, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    monthlyPayment: { value: 520, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    acquisitionFee: { value: 895, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    rebates: { value: 0, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    hunterDiscount: { value: 1800, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    manufacturerRebate: { value: 0, provenance_status: 'matched_from_verified_program', disclosure_required: false },
  };

  it('should be publishable with fully verified data (EXACT_CONTRACT)', () => {
    const result = EligibilityEngine.evaluate(baseData, 'EXACT_CONTRACT');

    expect(result.is_publishable).toBe(true);
    expect(result.publish_mode).toBe('EXACT_MATCH');
    expect(result.blocking_reasons).toHaveLength(0);
  });

  it('should be publishable in ADVERTISED mode (calculator not reusable)', () => {
    const result = EligibilityEngine.evaluate(baseData, 'ADVERTISED');

    expect(result.is_publishable).toBe(true);
    expect(result.publish_mode).toBe('ADVERTISED_WITH_ASSUMPTIONS');
    expect(result.calculator_reuse_eligible).toBe(false);
  });

  it('should BLOCK publish if MSRP is unresolved', () => {
    const data = {
      ...baseData,
      msrp: { ...baseData.msrp, provenance_status: 'unresolved' as const }
    };
    const result = EligibilityEngine.evaluate(data, 'EXACT_CONTRACT');

    expect(result.is_publishable).toBe(false);
    expect(result.blocking_reasons[0]).toContain('MSRP is missing or unresolved');
  });

  it('should ADD disclaimer (not block) when dealer MF markup detected (Honest Marketplace)', () => {
    const result = EligibilityEngine.evaluate(baseData, 'EXACT_CONTRACT', { mf_markup: 0.0005 });

    // Honest Marketplace: markups are disclosed, not blocked
    expect(result.is_publishable).toBe(true);
    expect(result.mandatory_disclaimers.some((d: string) => d.includes('markup'))).toBe(true);
  });

  it('should include doc fee disclaimer when disclosure_required=true', () => {
    const data = {
      ...baseData,
      docFee: { ...baseData.docFee, disclosure_required: true, value: 85 }
    };
    const result = EligibilityEngine.evaluate(data, 'EXACT_CONTRACT');

    expect(result.mandatory_disclaimers).toContain('Excludes $85 Dealer Doc Fee');
  });

  it('should include rebate disclaimer when rebates present', () => {
    const data = {
      ...baseData,
      rebates: { value: 1500, provenance_status: 'matched_from_verified_program' as const, disclosure_required: false }
    };
    const result = EligibilityEngine.evaluate(data, 'EXACT_CONTRACT');

    expect(result.mandatory_disclaimers).toContain('Includes $1500 in applicable rebates');
  });
});
