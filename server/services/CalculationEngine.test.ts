import { describe, it, expect } from 'vitest';
import { CalculationEngine } from './CalculationEngine';
import { FinancialData } from '../../src/types/engine';

describe('CalculationEngine', () => {
  const mockDb = {
    makes: [
      {
        name: 'Toyota',
        models: [
          {
            name: 'Camry',
            trims: [
              {
                name: 'SE',
                mf: 0.002,
                rv36: 55,
                msrp: 30000
              }
            ]
          }
        ]
      }
    ]
  };

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

  describe('calculateLease', () => {
    it('should return ESTIMATE if msrp or salePrice is unresolved', () => {
      const data = { ...baseData, msrp: { ...baseData.msrp, provenance_status: 'unresolved' as const } };
      const result = CalculationEngine.calculateLease(data, mockDb);
      expect(result.mode).toBe('ESTIMATE');
      expect(result.calculatedPayment).toBe(0);
    });

    it('should calculate lease payment correctly', () => {
      const result = CalculationEngine.calculateLease(baseData, mockDb);
      
      // Manual calculation:
      // salePrice = 28000
      // acqFee = 650
      // rebates = 500
      // capCost = 28000 + 650 - 500 = 28150
      // residualValue = 30000 * 0.55 = 16500
      // term = 36
      // depreciation = (28150 - 16500) / 36 = 11650 / 36 = 323.6111
      // rentCharge = (28150 + 16500) * 0.002 = 44650 * 0.002 = 89.3
      // basePayment = 323.6111 + 89.3 = 412.9111
      // taxRate = 0.095
      // totalPayment = 412.9111 * 1.095 = 452.1376
      
      expect(result.calculatedPayment).toBeCloseTo(452.1376, 2);
      expect(result.leasePay).toBeCloseTo(452.1376, 2);
    });

    it('should detect EXACT_CONTRACT mode when delta is small and data is verified', () => {
      const data: FinancialData = { 
        ...baseData, 
        monthlyPayment: { value: 452.14, provenance_status: 'extracted_from_document', disclosure_required: false } 
      };
      const result = CalculationEngine.calculateLease(data, mockDb);
      expect(result.mode).toBe('EXACT_CONTRACT');
      expect(result.delta).toBeLessThan(5);
    });

    it('should detect ADVERTISED mode when fees or taxes are estimated', () => {
      const data: FinancialData = { 
        ...baseData, 
        docFee: { value: 85, provenance_status: 'estimated_from_rule', disclosure_required: false } 
      };
      const result = CalculationEngine.calculateLease(data, mockDb);
      expect(result.mode).toBe('ADVERTISED');
    });

    it('should apply MSD reduction correctly', () => {
      const data = { ...baseData, msdCount: 7 };
      const result = CalculationEngine.calculateLease(data, mockDb);
      
      // mf = 0.002 - (7 * 0.00007) = 0.002 - 0.00049 = 0.00151
      expect(result.mf).toBe(0.00151);
      
      // rentCharge = (28150 + 16500) * 0.00151 = 44650 * 0.00151 = 67.4215
      // basePayment = 323.6111 + 67.4215 = 391.0326
      // totalPayment = 391.0326 * 1.095 = 428.1807
      expect(result.calculatedPayment).toBeCloseTo(428.1807, 2);
    });

    it('should identify MF markup', () => {
      const data: FinancialData = { 
        ...baseData, 
        moneyFactor: { value: 0.0025, provenance_status: 'extracted_from_document', disclosure_required: false } 
      };
      const result = CalculationEngine.calculateLease(data, mockDb);
      expect(result.markups?.mf_markup).toBeCloseTo(0.0005, 4);
    });
  });

  describe('calculateTCO', () => {
    it('should calculate total cost of ownership correctly', () => {
      const params = {
        monthlyPayment: 500,
        term: 36,
        dueAtSigning: 3000,
        insurancePerMonth: 100,
        maintenancePerMonth: 50,
        registrationPerYear: 400
      };
      
      const result = CalculationEngine.calculateTCO(params);
      
      // totalLeasePayments = 500 * 36 = 18000
      // totalInsurance = 100 * 36 = 3600
      // totalMaintenance = 50 * 36 = 1800
      // totalRegistration = (400 / 12) * 36 = 1200
      // totalCost = 18000 + 3000 + 3600 + 1800 + 1200 = 27600
      
      expect(result.totalCost).toBe(27600);
      expect(result.monthlyAverage).toBe(27600 / 36);
      expect(result.breakdown.lease).toBe(21000);
      expect(result.breakdown.insurance).toBe(3600);
    });
  });
});
