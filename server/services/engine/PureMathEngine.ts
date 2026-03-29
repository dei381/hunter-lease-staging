export interface LeaseMathParams {
  msrpCents: number;
  sellingPriceCents: number;
  residualValuePercent: number;
  moneyFactor: number;
  term: number;
  downPaymentCents: number; // Cash down + trade equity
  acqFeeCents: number;
  docFeeCents: number;
  dmvFeeCents: number;
  brokerFeeCents: number;
  taxRate: number;
}

export interface FinanceMathParams {
  sellingPriceCents: number;
  totalIncentivesCents?: number;
  apr: number;
  term: number;
  downPaymentCents: number; // Cash down + trade equity
  docFeeCents: number;
  dmvFeeCents: number;
  brokerFeeCents: number;
  taxRate: number;
}

export class PureMathEngine {
  static calculateLease(params: LeaseMathParams) {
    const {
      msrpCents, sellingPriceCents, residualValuePercent, moneyFactor,
      term, downPaymentCents, acqFeeCents, docFeeCents, dmvFeeCents, brokerFeeCents, taxRate
    } = params;

    const capitalizedFeesCents = acqFeeCents;
    const upfrontFeesCents = docFeeCents + dmvFeeCents + brokerFeeCents;
    const totalFeesCents = capitalizedFeesCents + upfrontFeesCents;
    
    const residualValueCents = Math.round(msrpCents * residualValuePercent);
    
    // Cap cost is selling price + capitalized fees - down payment (cash + trade)
    const capCostCents = sellingPriceCents + capitalizedFeesCents - downPaymentCents;
    
    const depreciationCents = (capCostCents - residualValueCents) / term;
    const rentChargeCents = (capCostCents + residualValueCents) * moneyFactor;
    
    const basePaymentCents = depreciationCents + rentChargeCents;
    const monthlyTaxCents = basePaymentCents * taxRate;
    let finalPaymentCents = Math.round(basePaymentCents + monthlyTaxCents);
    
    if (isNaN(finalPaymentCents) || !isFinite(finalPaymentCents) || finalPaymentCents < 0) {
      throw new Error("MATH_ERROR");
    }

    return {
      finalPaymentCents,
      basePaymentCents: Math.round(basePaymentCents),
      monthlyTaxCents: Math.round(monthlyTaxCents),
      depreciationCents: Math.round(depreciationCents),
      rentChargeCents: Math.round(rentChargeCents),
      capCostCents: Math.round(capCostCents),
      residualValueCents,
      totalFeesCents,
      capitalizedFeesCents,
      upfrontFeesCents,
      sellingPriceCents
    };
  }

  static calculateFinance(params: FinanceMathParams) {
    const {
      sellingPriceCents, totalIncentivesCents, apr, term, downPaymentCents,
      docFeeCents, dmvFeeCents, brokerFeeCents, taxRate
    } = params;

    const totalFeesCents = docFeeCents + dmvFeeCents + brokerFeeCents;
    // In finance, taxes are usually calculated on the selling price upfront and rolled into the loan
    // In California, manufacturer rebates are taxable, so we add them back to the selling price for tax calculation
    const upfrontTaxCents = (sellingPriceCents + (totalIncentivesCents || 0)) * taxRate;
    const principalCents = sellingPriceCents + totalFeesCents + upfrontTaxCents - downPaymentCents;
    const monthlyRate = (apr / 100) / 12;

    let finalPaymentCents = 0;
    if (monthlyRate === 0) {
      finalPaymentCents = Math.round(principalCents / term);
    } else {
      finalPaymentCents = Math.round(
        (principalCents * monthlyRate * Math.pow(1 + monthlyRate, term)) /
        (Math.pow(1 + monthlyRate, term) - 1)
      );
    }

    if (isNaN(finalPaymentCents) || !isFinite(finalPaymentCents) || finalPaymentCents < 0) {
      throw new Error("MATH_ERROR");
    }

    return {
      finalPaymentCents,
      principalCents: Math.round(principalCents),
      upfrontTaxCents: Math.round(upfrontTaxCents),
      totalFeesCents,
      sellingPriceCents
    };
  }
}
