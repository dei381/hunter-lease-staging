import { describe, it, expect } from 'vitest';
import { EligibilityEngine } from './EligibilityEngine';
import { FinancialData } from '../../src/types/engine';

describe('EligibilityEngine', () => {
  const baseData: FinancialData = {
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    msrp: { value: 30000, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    salePrice: { value: 28000, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    residualValue: { value: 0.55, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    moneyFactor: { value: 0.002, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    term: { value: 36, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    docFee: { value: 85, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    dmvFee: { value: 400, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    taxMonthly: { value: 0.095, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    monthlyPayment: { value: 450, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    acquisitionFee: { value: 650, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    rebates: { value: 500, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    hunterDiscount: { value: 2000, provenance_status: 'matched_from_verified_program', disclosure_required: false },
    manufacturerRebate: { value: 0, provenance_status: 'matched_from_verified_program', disclosure_required: false }
  };

  it('should be publishable in EXACT_MATCH mode', () => {
    const result = EligibilityEngine.evaluate(baseData, 'EXACT_CONTRACT');
    expect(result.is_publishable).toBe(true);
    expect(result.publish_mode).toBe('EXACT_MATCH');
    expect(result.calculator_reuse_eligible).toBe(true);
  });

  it('should be publishable in ADVERTISED_WITH_ASSUMPTIONS mode', () => {
    const result = EligibilityEngine.evaluate(baseData, 'ADVERTISED');
    expect(result.is_publishable).toBe(true);
    expect(result.publish_mode).toBe('ADVERTISED_WITH_ASSUMPTIONS');
    expect(result.calculator_reuse_eligible).toBe(false);
  });

  it('should not be publishable if MSRP is unresolved', () => {
    const data = { ...baseData, msrp: { ...baseData.msrp, provenance_status: 'unresolved' as const } };
    const result = EligibilityEngine.evaluate(data, 'EXACT_CONTRACT');
    expect(result.is_publishable).toBe(false);
    expect(result.blocking_reasons).toContain('MSRP is unresolved');
  });

  it('should not be publishable if MF markup is detected', () => {
    const markups = { mf_markup: 0.0005 };
    const result = EligibilityEngine.evaluate(baseData, 'EXACT_CONTRACT', markups);
    expect(result.is_publishable).toBe(false);
    expect(result.blocking_reasons[0]).toContain('Dealer markup detected on Money Factor');
  });

  it('should generate correct disclaimers', () => {
    const data: FinancialData = { 
      ...baseData, 
      docFee: { ...baseData.docFee, disclosure_required: true },
      rebates: { value: 500, provenance_status: 'matched_from_verified_program', disclosure_required: false },
      hunterDiscount: { value: 1000, provenance_status: 'matched_from_verified_program', disclosure_required: false, isGlobal: true }
    };
    const result = EligibilityEngine.evaluate(data, 'EXACT_CONTRACT');
    expect(result.mandatory_disclaimers).toContain('Excludes $85 Dealer Doc Fee');
    expect(result.mandatory_disclaimers).toContain('Includes $500 in applicable rebates');
    expect(result.mandatory_disclaimers).toContain('Includes $1000 wholesale discount for everyone');
  });
});
