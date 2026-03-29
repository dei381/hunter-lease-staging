import { PaymentBreakdown, QuoteContext } from './types';

export class Formatter {
  static formatLease(
    context: QuoteContext,
    mathResult: any,
    resolvedData: any,
    modifiers: any
  ): PaymentBreakdown {
    const { term, msdCount } = context;
    const { finalPaymentCents, totalFeesCents, upfrontFeesCents, capitalizedFeesCents, monthlyTaxCents } = mathResult;
    const { taxRate, acqFeeCents, docFeeCents, dmvFeeCents, brokerFeeCents } = resolvedData.settings;

    // Calculate MSD Amount (rounded up to nearest $50)
    const msdAmountCents = msdCount > 0 ? msdCount * Math.ceil(finalPaymentCents / 5000) * 5000 : 0;
    
    // Calculate DAS
    const downPaymentCents = context.downPaymentCents + context.tradeInEquityCents;
    
    // In California, Capitalized Cost Reduction (CCR) is taxed upfront.
    // CCR includes Cash Down, Trade-In Equity, and Taxable Incentives.
    const ccrForTax = Math.max(0, downPaymentCents + resolvedData.totalIncentivesCents);
    const upfrontTaxesCents = Math.round(ccrForTax * taxRate);
    
    const firstMonthCents = finalPaymentCents;
    
    const dueAtSigningCents = context.downPaymentCents + firstMonthCents + upfrontTaxesCents + upfrontFeesCents + msdAmountCents;

    // Calculate TCO
    const insurancePerMonthCents = 15000;
    const maintenancePerMonthCents = 5000;
    const registrationPerYearCents = 40000;
    
    const totalLeasePaymentsCents = finalPaymentCents * term;
    const totalCostCents = totalLeasePaymentsCents + dueAtSigningCents + (insurancePerMonthCents * term) + (maintenancePerMonthCents * term) + ((registrationPerYearCents / 12) * term);

    return {
      calcStatus: 'SUCCESS',
      warnings: [],
      monthlyPaymentCents: finalPaymentCents,
      dueAtSigningCents,
      dasBreakdown: {
        downPaymentCents: context.downPaymentCents,
        firstMonthCents,
        upfrontTaxesCents,
        upfrontFeesCents,
        msdAmountCents
      },
      msrpCents: resolvedData.vehicle.msrpCents,
      sellingPriceCents: mathResult.sellingPriceCents,
      dealerDiscountCents: resolvedData.dealerDiscountCents,
      totalIncentivesCents: resolvedData.totalIncentivesCents,
      residualValueCents: mathResult.residualValueCents || 0,
      appliedMf: modifiers.mf,
      appliedApr: modifiers.apr,
      appliedRvPercent: modifiers.rv,
      taxes: {
        rate: taxRate,
        monthlyTaxCents,
        upfrontTaxCents: upfrontTaxesCents
      },
      fees: {
        acqFeeCents,
        docFeeCents,
        dmvFeeCents,
        brokerFeeCents,
        capitalizedFeesCents,
        upfrontFeesCents
      },
      tco: {
        totalCostCents,
        monthlyAverageCents: Math.round(totalCostCents / term)
      },
      sourceMetadata: {
        lenderId: resolvedData.program?.id || null,
        lenderName: resolvedData.program?.lender?.name || 'Unknown',
        msrpSource: context.adminOverrides?.msrpCents ? 'ADMIN_OVERRIDE' : 'DB',
        ratesSource: context.adminOverrides?.mf ? 'ADMIN_OVERRIDE' : 'BANK_PROGRAM'
      }
    };
  }

  static formatFinance(
    context: QuoteContext,
    mathResult: any,
    resolvedData: any,
    modifiers: any
  ): PaymentBreakdown {
    const { term } = context;
    const { finalPaymentCents, totalFeesCents, upfrontTaxCents } = mathResult;
    const { taxRate, docFeeCents, dmvFeeCents, brokerFeeCents } = resolvedData.settings;

    // Calculate DAS
    const downPaymentCents = context.downPaymentCents + context.tradeInEquityCents;
    const dueAtSigningCents = context.downPaymentCents; // In finance, fees/taxes are usually rolled in, and DAS is just the cash down payment

    // Calculate TCO
    const insurancePerMonthCents = 15000;
    const maintenancePerMonthCents = 5000;
    const registrationPerYearCents = 40000;
    
    const totalPaymentsCents = finalPaymentCents * term;
    const totalCostCents = totalPaymentsCents + dueAtSigningCents + (insurancePerMonthCents * term) + (maintenancePerMonthCents * term) + ((registrationPerYearCents / 12) * term);

    return {
      calcStatus: 'SUCCESS',
      warnings: [],
      monthlyPaymentCents: finalPaymentCents,
      dueAtSigningCents,
      dasBreakdown: {
        downPaymentCents: context.downPaymentCents,
        firstMonthCents: 0, // Not applicable in finance
        upfrontTaxesCents: 0, // Rolled in
        upfrontFeesCents: 0, // Rolled in
        msdAmountCents: 0
      },
      msrpCents: resolvedData.vehicle.msrpCents,
      sellingPriceCents: mathResult.sellingPriceCents,
      dealerDiscountCents: resolvedData.dealerDiscountCents,
      totalIncentivesCents: resolvedData.totalIncentivesCents,
      residualValueCents: 0, // Not applicable
      appliedMf: 0, // Not applicable
      appliedApr: modifiers.apr,
      appliedRvPercent: 0, // Not applicable
      taxes: {
        rate: taxRate,
        monthlyTaxCents: 0,
        upfrontTaxCents
      },
      fees: {
        acqFeeCents: 0, // Not applicable
        docFeeCents,
        dmvFeeCents,
        brokerFeeCents,
        capitalizedFeesCents: totalFeesCents,
        upfrontFeesCents: 0
      },
      tco: {
        totalCostCents,
        monthlyAverageCents: Math.round(totalCostCents / term)
      },
      sourceMetadata: {
        lenderId: resolvedData.program?.id || null,
        lenderName: resolvedData.program?.lender?.name || 'Unknown',
        msrpSource: context.adminOverrides?.msrpCents ? 'ADMIN_OVERRIDE' : 'DB',
        ratesSource: context.adminOverrides?.apr ? 'ADMIN_OVERRIDE' : 'BANK_PROGRAM'
      }
    };
  }
}
