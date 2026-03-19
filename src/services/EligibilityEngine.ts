import { FinancialData, PublishEligibility, PublishMode } from '../types/engine';

export class EligibilityEngine {
  /**
   * Evaluates if a deal is publishable and generates mandatory disclaimers
   */
  static evaluate(
    data: FinancialData, 
    calcMode: string, 
    markups?: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; },
    isFirstTimeBuyerEligible: boolean = true
  ): PublishEligibility {
    const blocking_reasons: string[] = [];
    const mandatory_disclaimers: string[] = [];
    
    if (!isFirstTimeBuyerEligible) {
      mandatory_disclaimers.push("Not available for first-time buyers");
    }
    // Check critical unresolved fields
    if (data.msrp.provenance_status === 'unresolved') blocking_reasons.push("MSRP is unresolved");
    if (data.term.provenance_status === 'unresolved') blocking_reasons.push("Term is unresolved");
    
    // Check disclosures
    if (data.docFee.disclosure_required) mandatory_disclaimers.push(`Excludes $${data.docFee.value} Dealer Doc Fee`);
    if (data.taxMonthly.disclosure_required) mandatory_disclaimers.push("Excludes Monthly Use Tax");
    if (data.dmvFee.disclosure_required) mandatory_disclaimers.push("Excludes DMV & Registration Fees");
    if (data.acquisitionFee.provenance_status === 'unresolved') mandatory_disclaimers.push("Acquisition fee estimated based on bank standard");
    if (data.rebates.value && data.rebates.value > 0) mandatory_disclaimers.push(`Includes $${data.rebates.value} in applicable rebates`);
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

    // Check markups
    if (markups) {
      if (markups.mf_markup && markups.mf_markup > 0) {
        blocking_reasons.push(`Dealer markup detected on Money Factor: +${markups.mf_markup.toFixed(5)}`);
      }
      if (markups.rv_markup && Math.abs(markups.rv_markup) > 0.01) {
        blocking_reasons.push(`Residual Value mismatch: difference of ${(markups.rv_markup * 100).toFixed(1)}%`);
      }
    }

    let is_publishable = blocking_reasons.length === 0;
    let publish_mode: PublishMode = 'NOT_ELIGIBLE';
    let calculator_reuse_eligible = false;

    if (is_publishable) {
      if (calcMode === 'EXACT_CONTRACT') {
        publish_mode = 'EXACT_MATCH';
        calculator_reuse_eligible = true;
      } else if (calcMode === 'ADVERTISED') {
        publish_mode = 'ADVERTISED_WITH_ASSUMPTIONS';
      } else {
        is_publishable = false;
        blocking_reasons.push("Calculation mode is ESTIMATE (11-Key Lock failed)");
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
