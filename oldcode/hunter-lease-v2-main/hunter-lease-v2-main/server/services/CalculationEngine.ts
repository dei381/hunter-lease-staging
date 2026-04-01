import { FinancialData, CalcMode } from '../../src/types/engine';
import { CALCULATOR_DB } from '../data/calculator-snapshot';

export class CalculationEngine {
  /**
   * Calculates a California Lease and determines the Calculation Mode
   */
  static calculateLease(data: FinancialData, db: any = CALCULATOR_DB): { 
    mode: CalcMode; 
    calculatedPayment: number; 
    delta: number;
    markups?: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; };
    leasePay: number;
    mf: number;
    rvAmt: number;
    leaseCash: number;
    acquisitionFee: number;
    rebates: number;
    depreciation: number;
    rentCharge: number;
    basePayment: number;
  } {
    // 1. Check if we have the minimum required fields for ANY calculation
    if (data.msrp.provenance_status === 'unresolved' || data.salePrice.provenance_status === 'unresolved') {
      return { 
        mode: 'ESTIMATE', 
        calculatedPayment: 0, 
        delta: 0,
        leasePay: 0,
        mf: 0,
        rvAmt: 0,
        leaseCash: 0,
        acquisitionFee: 0,
        rebates: 0,
        depreciation: 0,
        rentCharge: 0,
        basePayment: 0
      };
    }

    // 2. Determine if we have estimated fields (which drops us to ADVERTISED or ESTIMATE)
    const hasEstimatedFees = 
      data.docFee.provenance_status === 'estimated_from_rule' || 
      data.dmvFee.provenance_status === 'estimated_from_rule';
      
    const hasEstimatedTaxes = 
      data.taxMonthly.provenance_status === 'estimated_from_rule';

    // 11-Key Lock: Verify against db
    let hasVerifiedRates = false;
    let markups: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; } = {};
    
    if (data.make && data.model && data.trim) {
      const make = db.makes.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
      if (make) {
        const model = make.models.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase() || data.model.toLowerCase().includes(m.name.toLowerCase()));
        if (model) {
          const trim = model.trims.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase() || data.trim.toLowerCase().includes(t.name.toLowerCase()));
          if (trim) {
            // Assume Tier 1 for baseline verification if not specified
            const baseMf = trim.mf || 0;
            const baseRv = trim.rv36 || 0;
            
            const dealerMf = data.moneyFactor.value || 0;
            const dealerRv = data.residualValue.value || 0;
            
            // If dealer MF is significantly higher than base MF, it's a markup
            if (dealerMf > 0 && baseMf > 0) {
              if (dealerMf > baseMf + 0.00010) {
                markups.mf_markup = dealerMf - baseMf;
              } else {
                data.moneyFactor.provenance_status = 'matched_from_verified_program';
              }
            }
            
            // RV should match exactly (allowing for small rounding differences)
            if (dealerRv > 0 && baseRv > 0) {
              const dealerRvPercent = dealerRv > 1 ? dealerRv / (data.msrp.value || 1) : dealerRv;
              const baseRvPercent = baseRv > 1 ? baseRv / 100 : baseRv;
              
              if (Math.abs(dealerRvPercent - baseRvPercent) > 0.01) {
                markups.rv_markup = dealerRvPercent - baseRvPercent;
              } else {
                data.residualValue.provenance_status = 'matched_from_verified_program';
              }
            }
            
            if (data.moneyFactor.provenance_status === 'matched_from_verified_program' && 
                data.residualValue.provenance_status === 'matched_from_verified_program') {
              hasVerifiedRates = true;
            }
          }
        }
      }
    }

    // Math (Simplified CA Lease Logic)
    const msrp = data.msrp.value || 0;
    const hunterDiscount = data.hunterDiscount?.value || 0;
    const manufacturerRebate = data.manufacturerRebate?.value || 0;

    // If salePrice is not explicitly provided, calculate it from MSRP and Hunter Discount
    const salePrice = data.salePrice.value || (msrp - hunterDiscount);
    
    const rvPercent = data.residualValue.value || 0.5;
    let mf = data.moneyFactor.value || 0.002;
    const term = data.term.value || 36;
    const acqFee = data.acquisitionFee.value || 0;
    
    // Total rebates include manufacturer rebate and any other rebates
    const rebates = (data.rebates.value || 0) + manufacturerRebate;
    
    // Apply MSD reduction if applicable
    const msdCount = data.msdCount || 0;
    if (msdCount > 0) {
      // Typical reduction is 0.00007 per MSD
      mf = Math.max(0.00001, mf - (msdCount * 0.00007));
    }
    
    // If RV is provided as a flat number (e.g. 30000), use it directly, else calculate from MSRP
    const residualValue = rvPercent > 1 ? rvPercent : msrp * rvPercent;
    
    // Adjusted Cap Cost (simplified - assuming fees are capped)
    const capCost = salePrice + acqFee - rebates;
    
    const depreciation = (capCost - residualValue) / term;
    const rentCharge = (capCost + residualValue) * mf;
    const basePayment = depreciation + rentCharge;
    
    const taxRate = data.taxMonthly.value || 0; // e.g. 0.095 for 9.5%
    const totalPayment = basePayment * (1 + taxRate);

    const dealerPayment = data.monthlyPayment.value || 0;
    const delta = Math.abs(totalPayment - dealerPayment);

    // Determine Mode
    let mode: CalcMode = 'ESTIMATE';
    
    if (hasVerifiedRates && !hasEstimatedFees && !hasEstimatedTaxes && delta < 5) {
      mode = 'EXACT_CONTRACT';
    } else if (hasVerifiedRates && (hasEstimatedFees || hasEstimatedTaxes)) {
      mode = 'ADVERTISED';
    }

    return {
      mode,
      calculatedPayment: totalPayment,
      delta,
      markups,
      leasePay: totalPayment,
      mf,
      rvAmt: residualValue,
      leaseCash: rebates,
      acquisitionFee: acqFee,
      rebates: rebates,
      depreciation,
      rentCharge,
      basePayment
    };
  }

  /**
   * Calculates Total Cost of Ownership
   */
  static calculateTCO(params: {
    monthlyPayment: number;
    term: number;
    dueAtSigning: number;
    insurancePerMonth?: number;
    maintenancePerMonth?: number;
    registrationPerYear?: number;
  }) {
    const { 
      monthlyPayment, 
      term, 
      dueAtSigning, 
      insurancePerMonth = 150, 
      maintenancePerMonth = 50,
      registrationPerYear = 400
    } = params;

    const totalLeasePayments = monthlyPayment * term;
    const totalInsurance = insurancePerMonth * term;
    const totalMaintenance = maintenancePerMonth * term;
    const totalRegistration = (registrationPerYear / 12) * term;

    const totalCost = totalLeasePayments + dueAtSigning + totalInsurance + totalMaintenance + totalRegistration;

    return {
      totalCost,
      monthlyAverage: totalCost / term,
      breakdown: {
        lease: totalLeasePayments + dueAtSigning,
        insurance: totalInsurance,
        maintenance: totalMaintenance,
        registration: totalRegistration
      }
    };
  }
}
