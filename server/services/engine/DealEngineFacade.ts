import { QuoteContext, PaymentBreakdown } from './types';
import { Validator } from './Validator';
import { DataResolver } from './DataResolver';
import { ModifierEngine } from './ModifierEngine';
import { PureMathEngine } from './PureMathEngine';
import { Formatter } from './Formatter';
import { FinancialData, CalcMode } from '../../../src/types/engine';
import prisma from '../../lib/db';
import { getTaxRateByZip } from '../../utils/taxRates';

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
    const incentivesData = await DataResolver.resolveIncentives(context, vehicle);
    
    const totalIncentivesCents = incentivesData.totalRebateCents || 0;
    const taxableIncentivesCents = incentivesData.taxableRebateCents || 0;
    const nonTaxableIncentivesCents = incentivesData.nonTaxableRebateCents || 0;

    // Dynamic CA DMV Fee: ~0.65% of MSRP + $200 (added $50 buffer)
    settings.dmvFeeCents = Math.round(vehicle.msrpCents * 0.0065) + 20000;

    // Dynamic Tax Rate by ZIP
    settings.taxRate = getTaxRateByZip(context.zipCode || '');

    if (programs.length === 0) {
      const err = this.createErrorResponse('NO_PROGRAMS');
      err.warnings = [`Debug: make=${vehicle.make}, model=${vehicle.model}, trim=${vehicle.trim}, year=${vehicle.year}, term=${context.term}, mileage=${context.mileage}, type=${context.quoteType}`];
      return err;
    }

    // 2. Calculate for each program and find the best one
    let bestResult: PaymentBreakdown | null = null;
    const allResults: PaymentBreakdown[] = [];

    for (const program of programs) {
      const resolvedData = { 
        vehicle, 
        settings, 
        program, 
        dealerDiscountCents, 
        totalIncentivesCents,
        taxableIncentivesCents,
        nonTaxableIncentivesCents
      };
      
      // 3. Apply Modifiers
      let appliedMf = program.mf || 0;
      let appliedApr = program.apr || 0;
      let appliedRvPercent = program.rv || 0; 

      if (context.quoteType === 'LEASE') {
        appliedRvPercent = ModifierEngine.applyMileageAdjustment(appliedRvPercent, context.mileage);
      }

      // Skip the generic tier markup when the program already carries the customer's
      // exact tier rate (per-tier lease grid). Otherwise derive the tier rate from the
      // base buy-rate using the standard tier model.
      if (!(program as any)._exactTier) {
        const tierAdjusted = ModifierEngine.applyTierAdjustment(appliedMf, appliedApr, context.creditTier);
        appliedMf = tierAdjusted.mf;
        appliedApr = tierAdjusted.apr;
      }

      const modifiers = { mf: appliedMf, apr: appliedApr, rv: appliedRvPercent };

      // 4. Pure Math
      const sellingPriceCents = vehicle.msrpCents - dealerDiscountCents - nonTaxableIncentivesCents;
      const targetDasCents = context.downPaymentCents;

      try {
        let bestCashDownCents = targetDasCents;
        let mathResult;
        let formattedResult: PaymentBreakdown | undefined;

        if (context.quoteType === 'FINANCE') {
          // For finance, DAS is exactly cash down. No search needed.
          bestCashDownCents = targetDasCents;
          const downPaymentCents = bestCashDownCents + context.tradeInEquityCents;
          mathResult = PureMathEngine.calculateFinance({
            sellingPriceCents,
            totalIncentivesCents: taxableIncentivesCents, // Only apply taxable incentives as down payment equivalent in finance
            apr: appliedApr,
            term: context.term,
            downPaymentCents,
            docFeeCents: settings.docFeeCents,
            dmvFeeCents: settings.dmvFeeCents,
            brokerFeeCents: settings.brokerFeeCents,
            taxRate: settings.taxRate
          });
          formattedResult = Formatter.formatFinance(context, mathResult, resolvedData, modifiers);
        } else {
          // LEASE: Algebraic calculation of Cash Down from target DAS
          const baseCashDown = PureMathEngine.calculateLeaseCCRFromDAS({
            msrpCents: vehicle.msrpCents,
            sellingPriceCents,
            residualValueCents: Math.round(vehicle.msrpCents * appliedRvPercent),
            moneyFactor: appliedMf,
            term: context.term,
            targetDASCents: targetDasCents,
            tradeInEquityCents: context.tradeInEquityCents,
            taxRate: settings.taxRate,
            taxableIncentivesCents,
            acqFeeCents: settings.acqFeeCents,
            docFeeCents: settings.docFeeCents,
            dmvFeeCents: settings.dmvFeeCents,
            brokerFeeCents: settings.brokerFeeCents
          });
          
          let bestDiff = Infinity;
          let bestC = baseCashDown;

          // Test a small window around our algebraic guess to account for rounding cascades
          for (let offset = -100; offset <= 100; offset++) {
            const testCashDown = baseCashDown + offset;
            const testDownPayment = testCashDown + context.tradeInEquityCents + taxableIncentivesCents;
            const testContext = { ...context, downPaymentCents: testCashDown };
            
            try {
              const testMath = PureMathEngine.calculateLease({
                msrpCents: vehicle.msrpCents,
                sellingPriceCents,
                residualValuePercent: appliedRvPercent,
                moneyFactor: appliedMf,
                term: context.term,
                downPaymentCents: testDownPayment,
                acqFeeCents: settings.acqFeeCents,
                docFeeCents: settings.docFeeCents,
                dmvFeeCents: settings.dmvFeeCents,
                brokerFeeCents: settings.brokerFeeCents,
                taxRate: settings.taxRate
              });
              const testFormatted = Formatter.formatLease(testContext, testMath, resolvedData, modifiers);
              
              const diff = Math.abs(testFormatted.dueAtSigningCents - targetDasCents);
              if (diff < bestDiff) {
                bestDiff = diff;
                bestC = testCashDown;
                mathResult = testMath;
                formattedResult = testFormatted;
              }
              
              if (diff <= 1) {
                break; // Perfect match found
              }
            } catch (e) {
              // Ignore math errors for invalid offsets
            }
          }
          bestCashDownCents = bestC;
        }

        if (!formattedResult) {
          throw new Error("MATH_ERROR");
        }

        // Attach routing metadata
        formattedResult.lenderPriority = (program.lender as any)?.priority || 99;
        
        // Calculate a proxy for dealer reserve (markup potential)
        // E.g., if the bank allows up to 1% APR markup, the reserve is roughly 1% of the amount financed
        // For now, we'll use a simplified proxy: higher base MF/APR generally means more reserve potential,
        // or we could calculate the difference between base and max allowed markup.
        // Let's assume a standard 1% markup for finance, and 0.00040 for lease as max markup.
        if (context.quoteType === 'LEASE') {
          const markupMf = 0.00040;
          const rentChargeMarkup = (mathResult as any).capitalizedCostCents * markupMf * context.term;
          formattedResult.dealerReserveCents = rentChargeMarkup;
        } else {
          const markupApr = 0.01; // 1%
          const financeChargeMarkup = (mathResult as any).amountFinancedCents * markupApr * (context.term / 12);
          formattedResult.dealerReserveCents = financeChargeMarkup;
        }

        allResults.push(formattedResult);

        // 5. Pick the best result based on routing strategy
        if (!bestResult) {
          bestResult = formattedResult;
        } else {
          const strategy = settings.routingStrategy || 'BEST_FOR_CUSTOMER';
          
          if (strategy === 'BEST_FOR_CUSTOMER') {
            if (formattedResult.monthlyPaymentCents < bestResult.monthlyPaymentCents) {
              bestResult = formattedResult;
            }
          } else if (strategy === 'HIGHEST_PROFIT') {
            // For highest profit, we might look at highest dealer reserve or markup potential
            // This is a simplified proxy: higher MF/APR generally means more reserve potential
            const currentReserve = formattedResult.dealerReserveCents || 0;
            const bestReserve = bestResult.dealerReserveCents || 0;
            if (currentReserve > bestReserve) {
              bestResult = formattedResult;
            } else if (currentReserve === bestReserve && formattedResult.monthlyPaymentCents < bestResult.monthlyPaymentCents) {
              // Tie-breaker: better for customer
              bestResult = formattedResult;
            }
          } else if (strategy === 'HIGHEST_APPROVAL') {
            // Prefer lenders known for high approval rates (e.g., Captives or specific banks)
            // This would ideally use a priority score from the lender table
            const currentPriority = formattedResult.lenderPriority || 99;
            const bestPriority = bestResult.lenderPriority || 99;
            
            if (currentPriority < bestPriority) {
              bestResult = formattedResult;
            } else if (currentPriority === bestPriority && formattedResult.monthlyPaymentCents < bestResult.monthlyPaymentCents) {
              // Tie-breaker: better for customer
              bestResult = formattedResult;
            }
          }
        }

      } catch (error) {
        // If math fails for one program, continue to the next
        continue;
      }
    }

    if (!bestResult) {
      return this.createErrorResponse('MATH_ERROR');
    }

    // Populate options - group by lender and pick the best one for each
    const lenderBestResults = new Map<string, typeof allResults[0]>();
    for (const r of allResults) {
      const lenderName = r.sourceMetadata.lenderName || 'Unknown';
      const existing = lenderBestResults.get(lenderName);
      if (!existing || r.monthlyPaymentCents < existing.monthlyPaymentCents) {
        lenderBestResults.set(lenderName, r);
      }
    }

    bestResult.options = Array.from(lenderBestResults.values()).map(r => ({
      lenderType: r.sourceMetadata.lenderType,
      lenderName: r.sourceMetadata.lenderName,
      monthlyPaymentCents: r.monthlyPaymentCents,
      isBest: r === bestResult
    }));

    if (vehicle.availableIncentives) {
      bestResult.availableIncentives = vehicle.availableIncentives;
    }

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
      sourceMetadata: { lenderId: null, lenderName: 'Unknown', lenderType: 'Unknown', msrpSource: 'DB', ratesSource: 'BANK_PROGRAM' }
    };
  }

  static mapCatalogDeals(
    dealsToProcess: any[],
    cachedMaps: any,
    settings: any,
    queryParams: any
  ) {
    const { term: queryTerm, down: queryDown, mileage: queryMileage, tier: queryTier } = queryParams;
    const { makeMap: carDbMakeMap, modelMap: carDbModelMap, trimMap: carDbTrimMap } = cachedMaps;

    const acqFeeCents = (settings.acquisitionFee ?? 650) * 100;
    const docFeeCents = (settings.docFee ?? 85) * 100;
    const dmvFeeCents = (settings.dmvFee ?? 400) * 100;
    const brokerFeeCents = (settings.brokerFee ?? 0) * 100;
    const taxRate = (settings.taxRateDefault || 8.875) / 100;

    let getVal = (v: any, def = 0) => {
      if (v === undefined || v === null) return def;
      if (typeof v === 'number') return v;
      if (typeof v === 'string') {
        const parsed = parseFloat(v.replace(/[^0-9.-]+/g, ""));
        return isNaN(parsed) ? def : parsed;
      }
      if (typeof v === 'object') {
        if (v.value !== undefined && v.value !== null) {
          const parsed = typeof v.value === 'string' ? parseFloat(v.value.replace(/[^0-9.-]+/g, "")) : Number(v.value);
          return isNaN(parsed) ? def : parsed;
        }
      }
      return def;
    };

    return dealsToProcess.map(({ deal, data }) => {
      // NOTE: catalog cards are COMPUTED live from our rates (MF/RV) + our incentives
      // for the requested term/tier/mileage — we deliberately do NOT show a pre-baked
      // source payment. Dealer discounts come only from the admin discount manager.
      const hunterDiscount = data.hunterDiscount?.isGlobal ? (data.hunterDiscount.value || 0) : 0;
      const manufacturerRebate = data.manufacturerRebate?.isGlobal ? (data.manufacturerRebate.value || 0) : 0;
      const totalGlobalSavings = hunterDiscount + manufacturerRebate;

      let msrp = getVal(data.msrp);
      let mf = getVal(data.moneyFactor || data.mf, 0.002);
      let rv = getVal(data.residualValue || data.rv, 0.5);
      let leaseCash = getVal(data.leaseCash || data.rebates, 0);
      let term = queryTerm ? parseInt(queryTerm as string, 10) : getVal(data.term, 36);
      let down = queryDown ? parseInt(queryDown as string, 10) : getVal(data.down !== undefined ? data.down : data.dueAtSigning, 3000);
      let savings = getVal(data.savings, 0);
      let discount = getVal(data.dealerDiscount || data.discount, 0);
      
      let incentivesSum = Array.isArray(data.incentives) ? data.incentives.reduce((sum: number, inc: any) => sum + (Number(inc.amount) || 0), 0) : 0;
      let rebates = getVal(data.rebates, 0) + incentivesSum;
      
      let apr = getVal(data.apr, 4.9);

      const effectiveDiscount = totalGlobalSavings > 0 ? hunterDiscount : savings;
      
      let type = data.type || 'lease';

      let usedTiersData = false;
      if (data.make && data.model && data.trim) {
        const makeKey = data.make.toLowerCase();
        const modelKey = `${makeKey}-${data.model.toLowerCase()}`;
        const trimKey = `${modelKey}-${data.trim.toLowerCase()}`;
        
        const makeObj = carDbMakeMap.get(makeKey);
        if (makeObj) {
          const modelObj = carDbModelMap.get(modelKey);
          if (modelObj) {
            const trimObj = carDbTrimMap.get(trimKey);
            if (trimObj) {
              msrp = Number(trimObj.msrp) || msrp;
              mf = trimObj.mf !== undefined && String(trimObj.mf) !== "" ? Number(trimObj.mf) : (modelObj.mf !== undefined && String(modelObj.mf) !== "" ? Number(modelObj.mf) : (makeObj.baseMF !== undefined && String(makeObj.baseMF) !== "" ? Number(makeObj.baseMF) : (mf !== undefined && String(mf) !== "" ? Number(mf) : 0.002)));
              rv = trimObj.rv36 !== undefined && String(trimObj.rv36) !== "" ? Number(trimObj.rv36) : (modelObj.rv36 !== undefined && String(modelObj.rv36) !== "" ? Number(modelObj.rv36) : (rv !== undefined && String(rv) !== "" ? Number(rv) : 0.55));
              leaseCash = trimObj.leaseCash !== undefined && String(trimObj.leaseCash) !== "" ? Number(trimObj.leaseCash) : (leaseCash !== undefined && String(leaseCash) !== "" ? Number(leaseCash) : 0);
              apr = trimObj.baseAPR !== undefined && String(trimObj.baseAPR) !== "" ? Number(trimObj.baseAPR) : (modelObj.baseAPR !== undefined && String(modelObj.baseAPR) !== "" ? Number(modelObj.baseAPR) : (makeObj.baseAPR !== undefined && String(makeObj.baseAPR) !== "" ? Number(makeObj.baseAPR) : (apr !== undefined && String(apr) !== "" ? Number(apr) : 4.9)));

              if (queryTier) {
                const tierId = queryTier as string;
                const makeTier = makeObj.tiers?.find((t: any) => t.id === tierId);
                
                if (makeTier || modelObj.tiersData?.[tierId] || trimObj.tiersData?.[tierId]) {
                  const fallbackMakeTier = makeTier || { mfAdd: 0, aprAdd: 0 };
                  const modelTier = modelObj.tiersData?.[tierId] || fallbackMakeTier;
                  const trimTier = trimObj.tiersData?.[tierId];

                  if (trimTier) {
                    mf = trimTier.mf !== undefined && trimTier.mf !== "" ? Number(trimTier.mf) : mf;
                    rv = trimTier.rv36 !== undefined && trimTier.rv36 !== "" ? Number(trimTier.rv36) : rv;
                    leaseCash = trimTier.leaseCash !== undefined && trimTier.leaseCash !== "" ? Number(trimTier.leaseCash) : leaseCash;
                    apr = trimTier.baseAPR !== undefined && trimTier.baseAPR !== "" ? Number(trimTier.baseAPR) : apr;
                  } else {
                    const adjusted = ModifierEngine.applyTierAdjustment(mf, apr, tierId);
                    mf = adjusted.mf;
                    apr = adjusted.apr;
                  }
                  
                  if (!data.tiersData) data.tiersData = {};
                  data.tiersData[tierId] = { mf, rv36: rv, baseAPR: apr, leaseCash };
                  usedTiersData = true;
                }
              }
            }
          }
        }
      }

      if (queryMileage) {
        if (queryMileage === '7.5k' || queryMileage === '7500') rv += 0.01;
        else if (queryMileage === '12k' || queryMileage === '12000') rv -= 0.015;
        else if (queryMileage === '15k' || queryMileage === '15000') rv -= 0.04;
        else if (queryMileage === '20k' || queryMileage === '20000') rv -= 0.05;
      }

      if (queryTier && !usedTiersData) {
        const adjusted = ModifierEngine.applyTierAdjustment(mf, apr, queryTier);
        mf = adjusted.mf;
      }

      let payment = 0;
      let financePayment = 0;
      const dealTaxRate = data.taxMonthly && typeof data.taxMonthly === 'number' ? data.taxMonthly : taxRate;

      let leaseDASCents = down * 100;
      let leaseCCR = leaseDASCents; 

      if (data.monthlyPayment?.provenance_status === 'manual') {
        payment = data.monthlyPayment.value || 0;
        leaseCCR = (data.downPayment?.value || 3000) * 100;
        down = leaseCCR / 100;
        if (type === 'finance') {
          financePayment = payment;
        }
      } else {
        const sellingPriceCents = (msrp - effectiveDiscount - discount) * 100;
        const residualValueCents = rv > 1 ? rv * 100 : Math.round(msrp * rv * 100);
        const taxableIncentivesCents = Math.max(leaseCash, manufacturerRebate, rebates) * 100;

        leaseCCR = PureMathEngine.calculateLeaseCCRFromDAS({
          msrpCents: msrp * 100,
          sellingPriceCents,
          residualValueCents,
          moneyFactor: mf,
          term,
          targetDASCents: leaseDASCents,
          tradeInEquityCents: 0,
          taxRate: dealTaxRate,
          taxableIncentivesCents,
          acqFeeCents,
          docFeeCents,
          dmvFeeCents,
          brokerFeeCents
        });

        const lease = PureMathEngine.calculateLease({
          msrpCents: msrp * 100,
          sellingPriceCents,
          residualValuePercent: rv > 1 ? rv / msrp : rv,
          moneyFactor: mf,
          term,
          downPaymentCents: leaseCCR + taxableIncentivesCents,
          acqFeeCents,
          docFeeCents,
          dmvFeeCents,
          brokerFeeCents,
          taxRate: dealTaxRate
        });
        payment = lease.finalPaymentCents / 100;
        
        if (queryTier && !usedTiersData) {
          const adjusted = ModifierEngine.applyTierAdjustment(0, apr, queryTier);
          apr = adjusted.apr;
        }

        const finance = PureMathEngine.calculateFinance({
          sellingPriceCents: (msrp - effectiveDiscount - discount) * 100,
          totalIncentivesCents: Math.max(leaseCash, manufacturerRebate, rebates) * 100,
          apr,
          term,
          downPaymentCents: down * 100,
          docFeeCents,
          dmvFeeCents,
          brokerFeeCents,
          taxRate: dealTaxRate
        });
        financePayment = finance.finalPaymentCents / 100;
      }

      return {
        deal, data,
        computed: {
          payment, financePayment, msrp, mf, rv, leaseCash, term, down, savings, discount, rebates, apr, type
        }
      };
    });
  }
}
