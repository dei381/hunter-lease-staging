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
  static calculateLeaseCCRFromDAS(params: {
    msrpCents: number;
    sellingPriceCents: number;
    residualValueCents: number;
    moneyFactor: number;
    term: number;
    targetDASCents: number;
    tradeInEquityCents: number;
    taxRate: number;
    taxableIncentivesCents: number;
    acqFeeCents: number;
    docFeeCents: number;
    dmvFeeCents: number;
    brokerFeeCents: number;
  }): number {
    const {
      sellingPriceCents, residualValueCents, moneyFactor, term,
      targetDASCents, tradeInEquityCents, taxRate, 
      taxableIncentivesCents,
      acqFeeCents, docFeeCents, dmvFeeCents, brokerFeeCents
    } = params;

    // Acquisition fee is collected upfront (in Due-At-Signing), NOT capitalized into
    // the monthly. This matches how lenders advertise the monthly payment (depreciation
    // + rent charge only), so our quotes line up with published grids.
    const S = sellingPriceCents;
    const R = residualValueCents;
    const N = term;
    const M = moneyFactor;
    const t = taxRate;
    const I_t = taxableIncentivesCents;
    const Fu = acqFeeCents + docFeeCents + dmvFeeCents + brokerFeeCents;
    const Te = tradeInEquityCents;
    const DAS = targetDASCents;

    const k = 1 / N + M;
    const B0 = (S - R) / N + (S + R) * M;
    const P0 = B0 * (1 + t);

    // D_approx denotes Cash Down + Trade Equity
    let D_approx = (DAS + Te - P0 - Fu + k * (1 + t) * I_t - I_t * t) / ((1 + t) * (1 - k));
    if (D_approx + I_t < 0) {
      D_approx = (DAS + Te - P0 - Fu + k * (1 + t) * I_t) / (1 - k * (1 + t));
    }

    return Math.max(0, Math.round(D_approx - Te));
  }

  static calculateLease(params: LeaseMathParams) {
    const {
      msrpCents, sellingPriceCents, residualValuePercent, moneyFactor,
      term, downPaymentCents, acqFeeCents, docFeeCents, dmvFeeCents, brokerFeeCents, taxRate
    } = params;

    // Acquisition fee is collected upfront (DAS), not capitalized into the monthly,
    // to match how lenders advertise lease payments (depreciation + rent only).
    const capitalizedFeesCents = 0;
    const upfrontFeesCents = acqFeeCents + docFeeCents + dmvFeeCents + brokerFeeCents;
    const totalFeesCents = capitalizedFeesCents + upfrontFeesCents;

    const residualValueCents = Math.round(msrpCents * residualValuePercent);

    // Cap cost is selling price + capitalized fees - down payment (cash + trade)
    const capCostCents = sellingPriceCents + capitalizedFeesCents - downPaymentCents;
    
    // Depreciation can't be negative — if cap cost falls below residual (e.g. an
    // oversized incentive), the monthly is just the rent charge, never a sub-$50 fluke.
    const depreciationCents = Math.max(0, (capCostCents - residualValueCents) / term);
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

  // Sign-and-drive ($0 due at signing): capitalize the upfront fees AND the first month's
  // payment into the cap cost so the customer pays nothing at signing and a slightly higher
  // monthly for all N months. Capitalizing the first month is self-referential (a higher
  // monthly raises the amount to capitalize), so we solve it in closed form.
  //   capCost = C + monthly,  monthly = [(capCost - R)/N + (capCost + R)*MF] * (1 + t)
  //   => capCost = (C + R*(MF - 1/N)*(1+t)) / (1 - (1/N + MF)*(1+t))
  // where C = sellingPrice + fees - (cash down + taxable incentives).
  static calculateLeaseSignAndDrive(params: LeaseMathParams) {
    const {
      msrpCents, sellingPriceCents, residualValuePercent, moneyFactor,
      term, downPaymentCents, acqFeeCents, docFeeCents, dmvFeeCents, brokerFeeCents, taxRate
    } = params;

    const R = Math.round(msrpCents * residualValuePercent);
    const N = term;
    const M = moneyFactor;
    const t = taxRate;
    const Fu = acqFeeCents + docFeeCents + dmvFeeCents + brokerFeeCents;
    // Base cap cost with fees capitalized and any cash-down / taxable-incentive reduction.
    const C = sellingPriceCents + Fu - downPaymentCents;

    const k = 1 / N + M;
    const denom = 1 - k * (1 + t);

    let capCostCents: number;
    if (denom > 0.01) {
      capCostCents = (C + R * (M - 1 / N) * (1 + t)) / denom;
    } else {
      // Degenerate (extreme MF/short term): don't capitalize the first month, only fees.
      capCostCents = C;
    }

    const depreciationCents = Math.max(0, (capCostCents - R) / N);
    const rentChargeCents = (capCostCents + R) * M;
    const basePaymentCents = depreciationCents + rentChargeCents;
    const monthlyTaxCents = basePaymentCents * t;
    const finalPaymentCents = Math.round(basePaymentCents + monthlyTaxCents);

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
      residualValueCents: R,
      totalFeesCents: Fu,
      capitalizedFeesCents: Fu, // fees rolled into the loan
      upfrontFeesCents: 0,      // nothing due upfront
      sellingPriceCents,
      signAndDrive: true,       // tells Formatter to put $0 (not the first month) at signing
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
    const principalCents = sellingPriceCents + totalFeesCents + upfrontTaxCents - downPaymentCents - (totalIncentivesCents || 0);
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
