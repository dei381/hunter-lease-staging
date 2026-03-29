import { QuoteContext, PaymentBreakdown } from './types';
import { Validator } from './Validator';
import { DataResolver } from './DataResolver';
import { ModifierEngine } from './ModifierEngine';
import { PureMathEngine } from './PureMathEngine';
import { Formatter } from './Formatter';
import { FinancialData, CalcMode } from '../../../src/types/engine';
import prisma from '../../lib/db';

export class DealEngineFacade {
  static async calculateForConsumer(rawBody: any): Promise<PaymentBreakdown> {
    const context = Validator.parseConsumerRequest(rawBody);
    return this.runPipeline(context);
  }

  static async calculateForAdmin(rawBody: any): Promise<PaymentBreakdown> {
    const context = Validator.parseAdminRequest(rawBody);
    return this.runPipeline(context);
  }

  static async calculateForAdminIngestion(data: FinancialData, carDb: any): Promise<{
    mode: CalcMode; 
    calculatedPayment: number; 
    delta: number;
    markups?: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; };
  }> {
    // 1. Check if we have the minimum required fields
    if (data.msrp.provenance_status === 'unresolved' || data.salePrice.provenance_status === 'unresolved') {
      return { mode: 'ESTIMATE', calculatedPayment: 0, delta: 0 };
    }

    const hasEstimatedFees = data.docFee.provenance_status === 'estimated_from_rule' || data.dmvFee.provenance_status === 'estimated_from_rule';
    const hasEstimatedTaxes = data.taxMonthly.provenance_status === 'estimated_from_rule';

    let hasVerifiedRates = false;
    let markups: { mf_markup?: number; rv_markup?: number; apr_markup?: number; hidden_fees?: number; } = {};
    
    // 11-Key Lock Verification
    if (data.make && data.model && data.trim) {
      const make = carDb.makes?.find((m: any) => m.name.toLowerCase() === data.make.toLowerCase());
      if (make) {
        const model = make.models?.find((m: any) => m.name.toLowerCase() === data.model.toLowerCase() || data.model.toLowerCase().includes(m.name.toLowerCase()));
        if (model) {
          const trim = model.trims?.find((t: any) => t.name.toLowerCase() === data.trim.toLowerCase() || data.trim.toLowerCase().includes(t.name.toLowerCase()));
          if (trim) {
            const baseMf = trim.mf || 0;
            const baseRv = trim.rv36 || 0;
            const dealerMf = data.moneyFactor.value || 0;
            const dealerRv = data.residualValue.value || 0;
            
            if (dealerMf > 0 && baseMf > 0) {
              if (dealerMf > baseMf + 0.00010) {
                markups.mf_markup = dealerMf - baseMf;
              } else {
                data.moneyFactor.provenance_status = 'matched_from_verified_program';
              }
            }
            
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

    // Map FinancialData to PureMathEngine params
    const msrp = data.msrp.value || 0;
    const hunterDiscount = data.hunterDiscount?.value || 0;
    const manufacturerRebate = data.manufacturerRebate?.value || 0;
    const salePrice = data.salePrice.value || (msrp - hunterDiscount);
    const rvPercent = data.residualValue.value || 0.5;
    let mf = data.moneyFactor.value || 0.002;
    const term = data.term.value || 36;
    const acqFee = data.acquisitionFee.value || 0;
    const rebates = (data.rebates.value || 0) + manufacturerRebate;
    const msdCount = data.msdCount || 0;

    mf = ModifierEngine.applyMsd(mf, msdCount);
    const residualValueCents = rvPercent > 1 ? rvPercent * 100 : msrp * rvPercent * 100;

    try {
      const mathResult = PureMathEngine.calculateLease({
        msrpCents: msrp * 100,
        sellingPriceCents: salePrice * 100,
        residualValuePercent: rvPercent > 1 ? rvPercent / msrp : rvPercent,
        moneyFactor: mf,
        term,
        downPaymentCents: rebates * 100, // In the old logic, rebates were subtracted from cap cost
        acqFeeCents: acqFee * 100,
        docFeeCents: 0,
        dmvFeeCents: 0,
        brokerFeeCents: 0,
        taxRate: data.taxMonthly.value || 0
      });

      const totalPayment = mathResult.finalPaymentCents / 100;
      const dealerPayment = data.monthlyPayment.value || 0;
      const delta = Math.abs(totalPayment - dealerPayment);

      let mode: CalcMode = 'ESTIMATE';
      if (hasVerifiedRates && !hasEstimatedFees && !hasEstimatedTaxes && delta < 5) {
        mode = 'EXACT_CONTRACT';
      } else if (hasVerifiedRates && (hasEstimatedFees || hasEstimatedTaxes)) {
        mode = 'ADVERTISED';
      }

      return { mode, calculatedPayment: totalPayment, delta, markups };
    } catch (e) {
      return { mode: 'ESTIMATE', calculatedPayment: 0, delta: 0, markups };
    }
  }

  private static async runPipeline(context: QuoteContext): Promise<PaymentBreakdown> {
    // 1. Resolve Data
    const vehicle = await DataResolver.resolveVehicle(context);
    if (!vehicle.msrpCents) {
      return this.createErrorResponse('MISSING_MSRP');
    }

    const settings = await DataResolver.resolveSettings();
    const programs = await DataResolver.resolvePrograms(context, vehicle);
    const dealerDiscountCents = await DataResolver.resolveDealerDiscount(context, vehicle);
    const totalIncentivesCents = await DataResolver.resolveIncentives(context, vehicle);

    if (programs.length === 0) {
      return this.createErrorResponse('NO_PROGRAMS');
    }

    // 2. Calculate for each program and find the best one
    let bestResult: PaymentBreakdown | null = null;
    const allResults: PaymentBreakdown[] = [];

    for (const program of programs) {
      const resolvedData = { vehicle, settings, program, dealerDiscountCents, totalIncentivesCents };
      
      // 3. Apply Modifiers
      let appliedMf = program.mf || 0;
      let appliedApr = program.apr || 0;
      let appliedRvPercent = program.rv || 0; 

      if (context.quoteType === 'LEASE') {
        appliedMf = ModifierEngine.applyMsd(appliedMf, context.msdCount);
        appliedRvPercent = ModifierEngine.applyMileageAdjustment(appliedRvPercent, context.mileage);
      }
      
      const tierAdjusted = ModifierEngine.applyTierAdjustment(appliedMf, appliedApr, context.creditTier);
      appliedMf = tierAdjusted.mf;
      appliedApr = tierAdjusted.apr;

      const modifiers = { mf: appliedMf, apr: appliedApr, rv: appliedRvPercent };

      // 4. Pure Math
      const sellingPriceCents = vehicle.msrpCents - dealerDiscountCents - totalIncentivesCents;
      const targetDasCents = context.downPaymentCents;

      try {
        let bestCashDownCents = targetDasCents;
        let low = -5000000; // -$50,000
        let high = targetDasCents;
        let mathResult;
        let formattedResult: PaymentBreakdown | undefined;

        // Binary search for cashDownCents to match targetDasCents
        for (let i = 0; i < 50; i++) {
          const mid = Math.round((low + high) / 2);
          const downPaymentCents = mid + context.tradeInEquityCents;
          const searchContext = { ...context, downPaymentCents: mid };

          try {
            if (context.quoteType === 'LEASE') {
              mathResult = PureMathEngine.calculateLease({
                msrpCents: vehicle.msrpCents,
                sellingPriceCents,
                residualValuePercent: appliedRvPercent,
                moneyFactor: appliedMf,
                term: context.term,
                downPaymentCents,
                acqFeeCents: settings.acqFeeCents,
                docFeeCents: settings.docFeeCents,
                dmvFeeCents: settings.dmvFeeCents,
                brokerFeeCents: settings.brokerFeeCents,
                taxRate: settings.taxRate
              });
              formattedResult = Formatter.formatLease(searchContext, mathResult, resolvedData, modifiers);
            } else {
              mathResult = PureMathEngine.calculateFinance({
                sellingPriceCents,
                totalIncentivesCents,
                apr: appliedApr,
                term: context.term,
                downPaymentCents,
                docFeeCents: settings.docFeeCents,
                dmvFeeCents: settings.dmvFeeCents,
                brokerFeeCents: settings.brokerFeeCents,
                taxRate: settings.taxRate
              });
              formattedResult = Formatter.formatFinance(searchContext, mathResult, resolvedData, modifiers);
            }

            const calculatedDas = formattedResult.dueAtSigningCents;
            
            if (Math.abs(calculatedDas - targetDasCents) <= 1) {
              bestCashDownCents = mid;
              break;
            }

            if (calculatedDas < targetDasCents) {
              low = mid + 1;
            } else {
              high = mid - 1;
            }
            bestCashDownCents = mid; // Keep track of the closest
          } catch (e) {
            // If math fails (e.g. negative payment), it means cash down is too high
            high = mid - 1;
          }
        }

        if (!formattedResult) {
          throw new Error("MATH_ERROR");
        }

        allResults.push(formattedResult);

        // 5. Pick the best result (lowest monthly payment)
        if (!bestResult || formattedResult.monthlyPaymentCents < bestResult.monthlyPaymentCents) {
          bestResult = formattedResult;
        }

      } catch (error) {
        // If math fails for one program, continue to the next
        continue;
      }
    }

    if (!bestResult) {
      return this.createErrorResponse('MATH_ERROR');
    }

    // Populate options
    bestResult.options = allResults.map(r => ({
      lenderType: 'Unknown',
      lenderName: r.sourceMetadata.lenderName,
      monthlyPaymentCents: r.monthlyPaymentCents,
      isBest: r === bestResult
    }));

    // Save QuoteSnapshot
    if (context.saveSnapshot && vehicle.id) {
      try {
        const snapshot = await prisma.quoteSnapshot.create({
          data: {
            vehicleId: vehicle.id,
            surface: 'VDP',
            quoteType: context.quoteType,
            quoteStatus: bestResult.calcStatus,
            confidenceLevel: 'HIGH',
            monthlyPaymentCents: bestResult.monthlyPaymentCents,
            effectiveDasOrDownCents: bestResult.dueAtSigningCents,
            totalSavingsCents: bestResult.dealerDiscountCents + bestResult.totalIncentivesCents,
            lenderId: bestResult.sourceMetadata.lenderId,
            auditPayload: JSON.stringify(bestResult)
          }
        });
        bestResult.quoteId = snapshot.id;
      } catch (e) {
        console.error("Failed to save QuoteSnapshot", e);
      }
    }

    return bestResult;
  }

  private static createErrorResponse(status: PaymentBreakdown['calcStatus']): PaymentBreakdown {
    return {
      calcStatus: status,
      warnings: [],
      monthlyPaymentCents: 0,
      dueAtSigningCents: 0,
      dasBreakdown: { downPaymentCents: 0, firstMonthCents: 0, upfrontTaxesCents: 0, upfrontFeesCents: 0, msdAmountCents: 0 },
      msrpCents: 0,
      sellingPriceCents: 0,
      dealerDiscountCents: 0,
      totalIncentivesCents: 0,
      residualValueCents: 0,
      appliedMf: 0,
      appliedApr: 0,
      appliedRvPercent: 0,
      taxes: { rate: 0, monthlyTaxCents: 0, upfrontTaxCents: 0 },
      fees: { acqFeeCents: 0, docFeeCents: 0, dmvFeeCents: 0, brokerFeeCents: 0, capitalizedFeesCents: 0, upfrontFeesCents: 0 },
      tco: { totalCostCents: 0, monthlyAverageCents: 0 },
      sourceMetadata: { lenderId: null, lenderName: 'Unknown', msrpSource: 'DB', ratesSource: 'BANK_PROGRAM' }
    };
  }
}
