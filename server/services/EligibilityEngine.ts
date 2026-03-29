import { FinancialData, PublishEligibility, PublishMode } from '../../src/types/engine';

export class EligibilityEngine {
  /**
   * Evaluates if a deal is publishable and generates mandatory disclaimers
   * Logic: DATA-CORRECT (Honest Marketplace). We publish if all data is real, 
   * even if it has dealer markups or differs from bank programs.
   */
  static evaluate(
    data: FinancialData, 
    calcMode: string, 
    markups?: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; },
    isFirstTimeBuyerEligible: boolean = true,
    calculatedPayment?: number
  ): PublishEligibility {
    const blocking_reasons: string[] = [];
    const mandatory_disclaimers: string[] = [];
    
    if (!isFirstTimeBuyerEligible) {
      mandatory_disclaimers.push("Not available for first-time buyers");
    }

    // 1. DATA-CORRECTNESS CHECKS (Blockers)
    // We block ONLY if data is missing, hallucinated, or mathematically invalid.
    if (!data.msrp || data.msrp.provenance_status === 'unresolved' || !data.msrp.value) {
      blocking_reasons.push("MSRP is missing or unresolved. System cannot use fake MSRP.");
    }
    if (!data.salePrice || data.salePrice.provenance_status === 'unresolved') {
      blocking_reasons.push("Selling Price is missing or unresolved.");
    }
    if (!data.term || data.term.provenance_status === 'unresolved' || !data.term.value) {
      blocking_reasons.push("Term is missing or unresolved.");
    }
    
    // For leases, RV and MF are mandatory to be DATA-CORRECT
    if (!data.residualValue || data.residualValue.provenance_status === 'unresolved') {
      blocking_reasons.push("Residual Value (RV) is missing. System cannot invent RV.");
    }
    if (!data.moneyFactor || data.moneyFactor.provenance_status === 'unresolved') {
      blocking_reasons.push("Money Factor (MF) is missing. System cannot invent rates.");
    }

    // Check for NaN / Infinity / 0 payment
    if (calculatedPayment !== undefined) {
      if (isNaN(calculatedPayment) || !isFinite(calculatedPayment) || calculatedPayment <= 0) {
        blocking_reasons.push(`Calculated payment is invalid ($${calculatedPayment}). Check math inputs.`);
      }
    }
    
    // 2. DISCLOSURES (Honesty)
    if (data.docFee?.disclosure_required) mandatory_disclaimers.push(`Excludes $${data.docFee.value} Dealer Doc Fee`);
    if (data.taxMonthly?.disclosure_required) mandatory_disclaimers.push("Excludes Monthly Use Tax");
    if (data.dmvFee?.disclosure_required) mandatory_disclaimers.push("Excludes DMV & Registration Fees");
    if (data.acquisitionFee?.provenance_status === 'unresolved' || data.acquisitionFee?.provenance_status === 'estimated_from_rule') {
      mandatory_disclaimers.push("Acquisition fee estimated based on standard regional/bank rules");
    }
    if (data.rebates?.value && data.rebates.value > 0) mandatory_disclaimers.push(`Includes $${data.rebates.value} in applicable rebates`);
    if (data.hunterDiscount?.value && data.hunterDiscount.value > 0) {
      if (data.hunterDiscount.isGlobal) {
        mandatory_disclaimers.push(`Includes $${data.hunterDiscount.value} wholesale discount for everyone`);
      } else {
        mandatory_disclaimers.push(`Includes $${data.hunterDiscount.value} selective discount`);
      }
    }
    if (data.manufacturerRebate?.value && data.manufacturerRebate.value > 0) {
      mandatory_disclaimers.push(`Includes $${data.manufacturerRebate.value} manufacturer rebate`);
    }

    // 3. MARKUPS ARE NOT BLOCKERS ANYMORE (Honest Marketplace)
    if (markups) {
      if (markups.mf_markup && markups.mf_markup > 0) {
        mandatory_disclaimers.push(`Note: Includes dealer markup on rate (+${markups.mf_markup.toFixed(5)})`);
      }
      if (markups.rv_markup && Math.abs(markups.rv_markup) > 0.01) {
        mandatory_disclaimers.push(`Note: Residual Value differs from standard bank program by ${(markups.rv_markup * 100).toFixed(1)}%`);
      }
    }

    let is_publishable = blocking_reasons.length === 0;
    let publish_mode: PublishMode = 'NOT_ELIGIBLE';
    let calculator_reuse_eligible = false;

    if (is_publishable) {
      // As long as data is correct, it's publishable.
      publish_mode = 'ADVERTISED_WITH_ASSUMPTIONS'; // Default honest mode
      
      if (calcMode === 'EXACT_CONTRACT') {
        publish_mode = 'EXACT_MATCH';
        calculator_reuse_eligible = true;
      } else if (calcMode === 'ADVERTISED') {
        publish_mode = 'ADVERTISED_WITH_ASSUMPTIONS';
      } else if (calcMode === 'ESTIMATE') {
        // If it's an estimate but passed the data checks above, it means it has all required data
        // but didn't match the bank program (e.g., dealer markup).
        // We PUBLISH IT because it's DATA-CORRECT.
        publish_mode = 'ADVERTISED_WITH_ASSUMPTIONS';
      }
    }

    return {
      is_publishable,
      publish_mode,
      mandatory_disclaimers,
      calculator_reuse_eligible,
      blocking_reasons,
      markups
    };
  }
}
