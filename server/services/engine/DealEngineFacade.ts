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
      return this.createErrorResponse('MISSING_MSRP', context.quoteType);
    }

    // These four reads are independent once we have the vehicle — run them in parallel
    // to cut calculator latency (was sequential).
    const [settings, programs, dealerDiscountCents, incentivesData] = await Promise.all([
      DataResolver.resolveSettings(),
      DataResolver.resolvePrograms(context, vehicle),
      DataResolver.resolveDealerDiscount(context, vehicle),
      DataResolver.resolveIncentives(context, vehicle),
    ]);
    
    const totalIncentivesCents = incentivesData.totalRebateCents || 0;
    const taxableIncentivesCents = incentivesData.taxableRebateCents || 0;
    const nonTaxableIncentivesCents = incentivesData.nonTaxableRebateCents || 0;

    // Dynamic CA DMV Fee: ~0.65% of MSRP + $200 (added $50 buffer)
    settings.dmvFeeCents = Math.round(vehicle.msrpCents * 0.0065) + 20000;

    // Dynamic Tax Rate by ZIP
    settings.taxRate = getTaxRateByZip(context.zipCode || '');

    if (programs.length === 0) {
      const err = this.createErrorResponse('NO_PROGRAMS', context.quoteType);
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
        } else if (targetDasCents === 0) {
          // LEASE sign-and-drive: the customer wants $0 at signing, so capitalize the first
          // payment + fees into the monthly (no cash-down search needed).
          mathResult = PureMathEngine.calculateLeaseSignAndDrive({
            msrpCents: vehicle.msrpCents,
            sellingPriceCents,
            residualValuePercent: appliedRvPercent,
            moneyFactor: appliedMf,
            term: context.term,
            downPaymentCents: taxableIncentivesCents + context.tradeInEquityCents, // cash down = 0
            acqFeeCents: settings.acqFeeCents,
            docFeeCents: settings.docFeeCents,
            dmvFeeCents: settings.dmvFeeCents,
            brokerFeeCents: settings.brokerFeeCents,
            taxRate: settings.taxRate
          });
          formattedResult = Formatter.formatLease({ ...context, downPaymentCents: 0 }, mathResult, resolvedData, modifiers);
          bestCashDownCents = 0;
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
      return this.createErrorResponse('MATH_ERROR', context.quoteType);
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

  private static createErrorResponse(
    status: PaymentBreakdown['calcStatus'],
    quoteType: PaymentBreakdown['quoteType'] = 'LEASE'
  ): PaymentBreakdown {
    return {
      calcStatus: status,
      quoteType,
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
    const brokerFeeCents = (Number(settings.brokerFee) || 0) * 100; // same default as DataResolver.resolveSettings (no broker fee)
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

      let effectiveDiscount = totalGlobalSavings > 0 ? hunterDiscount : savings;
      
      let type = data.type || 'lease';

      let usedTiersData = false;
      let usedCarDbRates = false;
      let carDbTrimName = '';
      if (data.make && data.model && data.trim) {
        const makeKey = data.make.toLowerCase();
        const modelKey = `${makeKey}-${data.model.toLowerCase()}`;
        const trimKey = `${modelKey}-${data.trim.toLowerCase()}`;
        
        const makeObj = carDbMakeMap.get(makeKey);
        if (makeObj) {
          const modelObj = carDbModelMap.get(modelKey);
          if (modelObj) {
            // Same exact -> word -> partial trim matching the calculator's resolver
            // applies; exact-key only missed short dealer-inventory trims ("SEL")
            // and the two paths then priced from different fallbacks.
            let trimObj = carDbTrimMap.get(trimKey);
            let fuzzyCarDbTrim = false;
            if (!trimObj && data.trim && Array.isArray(modelObj.trims)) {
              const lc = String(data.trim).toLowerCase();
              // Whole-word containment without a dynamic RegExp (ReDoS-safe):
              // the needle must appear with non-alphanumeric (or string) boundaries
              const isWordChar = (ch: string | undefined) => !!ch && /[a-z0-9]/.test(ch);
              const hasWord = (name: any) => {
                const n = String(name || '').toLowerCase();
                let idx = n.indexOf(lc);
                while (idx !== -1) {
                  if (!isWordChar(n[idx - 1]) && !isWordChar(n[idx + lc.length])) return true;
                  idx = n.indexOf(lc, idx + 1);
                }
                return false;
              };
              trimObj = modelObj.trims.find((t: any) => hasWord(t.name))
                || modelObj.trims.find((t: any) => String(t.name).toLowerCase().includes(lc));
              fuzzyCarDbTrim = !!trimObj;
            }
            if (trimObj?.name) carDbTrimName = trimObj.name;
            // Even with no trim match, make/model-level rates apply — the calculator's
            // carDb fallback prices unmatched trims from modelObj/makeObj the same way.
            usedCarDbRates = true;
            // Fuzzy/absent carDb match supplies RATES only; the listing's own MSRP
            // stays (it is the real per-VIN sticker, same as the calculator uses)
            if (trimObj && !fuzzyCarDbTrim) msrp = Number(trimObj.msrp) || msrp;
            mf = trimObj?.mf !== undefined && String(trimObj?.mf) !== "" ? Number(trimObj.mf) : (modelObj.mf !== undefined && String(modelObj.mf) !== "" ? Number(modelObj.mf) : (makeObj.baseMF !== undefined && String(makeObj.baseMF) !== "" ? Number(makeObj.baseMF) : (mf !== undefined && String(mf) !== "" ? Number(mf) : 0.002)));
            rv = trimObj?.rv36 !== undefined && String(trimObj?.rv36) !== "" ? Number(trimObj.rv36) : (modelObj.rv36 !== undefined && String(modelObj.rv36) !== "" ? Number(modelObj.rv36) : (rv !== undefined && String(rv) !== "" ? Number(rv) : 0.55));
            leaseCash = trimObj?.leaseCash !== undefined && String(trimObj?.leaseCash) !== "" ? Number(trimObj.leaseCash) : (leaseCash !== undefined && String(leaseCash) !== "" ? Number(leaseCash) : 0);
            apr = trimObj?.baseAPR !== undefined && String(trimObj?.baseAPR) !== "" ? Number(trimObj.baseAPR) : (modelObj.baseAPR !== undefined && String(modelObj.baseAPR) !== "" ? Number(modelObj.baseAPR) : (makeObj.baseAPR !== undefined && String(makeObj.baseAPR) !== "" ? Number(makeObj.baseAPR) : (apr !== undefined && String(apr) !== "" ? Number(apr) : 4.9)));

            if (queryTier) {
              const tierId = queryTier as string;
              const makeTier = makeObj.tiers?.find((t: any) => t.id === tierId);

              if (makeTier || modelObj.tiersData?.[tierId] || trimObj?.tiersData?.[tierId]) {
                const trimTier = trimObj?.tiersData?.[tierId];

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

      // Prefer the rate grid (LeaseProgram/FinanceProgram) — the SAME source the
      // calculator pipeline resolves from — so card and calculator numbers agree.
      // carDb values above remain as fallback for makes without grid data.
      let exactLeaseTier = false;
      let exactFinanceTier = false;
      let leaseIncentiveCents: number | null = null;
      let financeIncentiveCents: number | null = null;
      // Same taxable/non-taxable split the quote pipeline applies: non-taxable
      // incentives reduce the selling price; taxable ones act as cap cost reduction
      let leaseTaxableCents = 0, leaseNonTaxableCents = 0;
      let financeTaxableCents = 0, financeNonTaxableCents = 0;
      // Per-incentive lists for the card (same shape DataResolver returns: id/name/
      // amount/type/isDefault). isDefault === [applied] (auto-applied, in payment);
      // non-default === [cond:] selectable rebates. Built only for grid-priced cards.
      type CardIncentive = { id: string; name: string; amount: number; type: string; isDefault: boolean };
      let leaseAvailableIncentives: CardIncentive[] | null = null;
      let financeAvailableIncentives: CardIncentive[] | null = null;
      if (data.make && data.model && data.trim) {
        const tierId = (queryTier as string) || 't1';

        // Resolve the deal's trim onto a grid trim name. Dealer inventory trims are
        // short ("SE", "Limited") while grid trims carry the drivetrain ("SE AWD"):
        // exact -> trim+drivetrain -> word match -> partial, preferring the variant
        // that matches the car's drivetrain — mirroring the calculator resolver's
        // fuzzy matching (DataResolver word/partial regex), so both paths land on
        // the same grid row.
        // Resolve the deal's trim onto a grid trim using the SAME candidate set the
        // calculator's resolver builds (DataResolver possibleTrims): the carDb-matched
        // trim name, the original trim, the "Hybrid"-stripped form and the first word —
        // then, like the pipeline, take the best-for-customer row among the candidates.
        let gridTrim = data.trim;
        const modelTrims: Set<string> | undefined = cachedMaps.gridTrimsByModel?.get(`${data.make}|${data.model}`.toLowerCase());
        if (modelTrims && !modelTrims.has(data.trim)) {
          const lcByName = new Map(Array.from(modelTrims).map(t => [t.toLowerCase(), t]));
          const rawCandidates = [
            data.trim,
            carDbTrimName,
            String(data.trim).replace(/ Hybrid$/i, '').trim(),
            String(data.trim).split(' ')[0]
          ].filter(Boolean);
          const candidates = Array.from(new Set(
            rawCandidates
              .map(c => lcByName.get(String(c).toLowerCase()))
              .filter(Boolean) as string[]
          ));

          if (candidates.length === 1) {
            gridTrim = candidates[0];
          } else if (candidates.length > 1) {
            // Best for customer: lowest rough monthly (rates + trim incentives)
            let best: { trim: string; proxy: number } | null = null;
            for (const c of candidates) {
              const lp = cachedMaps.leaseGridMap?.get(`${data.make}|${data.model}|${c}|${term}|${tierId}`.toLowerCase());
              if (!lp || !(lp.mf > 0)) continue;
              const incSum = (cachedMaps.incentiveGridMap?.get(`${data.make}|${data.model}|${c}`.toLowerCase()) || [])
                .filter((inc: any) => {
                  const app = inc.dealApplicability;
                  if (app && app !== 'ALL' && app !== 'LEASE') return false;
                  const termRule = (inc.eligibilityRules as any)?.terms || (inc.eligibilityRules as any)?.term;
                  if (termRule && Array.isArray(termRule) && !termRule.includes(term)) return false;
                  return true;
                })
                .reduce((s: number, inc: any) => s + (Number(inc.amountCents) || 0), 0) / 100;
              const proxy = (msrp * (1 - lp.rv) - incSum) / term + msrp * (1 + lp.rv) * lp.mf;
              if (!best || proxy < best.proxy) best = { trim: c, proxy };
            }
            gridTrim = best?.trim || candidates[0];
          }
        }

        const gridKey = `${data.make}|${data.model}|${gridTrim}|${term}|${tierId}`.toLowerCase();
        const lp = cachedMaps.leaseGridMap?.get(gridKey);
        if (lp && lp.mf > 0) {
          mf = lp.mf;
          rv = lp.rv;
          exactLeaseTier = true; // grid row is per-tier — no generic tier markup
        }
        const fp = cachedMaps.financeGridMap?.get(gridKey);
        if (fp && fp.apr !== undefined && fp.apr !== null) {
          apr = fp.apr;
          exactFinanceTier = true;
        }

        // Term/type-aware incentives from OemIncentiveProgram (same source and the
        // same eligibility convention the quote pipeline applies)
        const incRows = [
          ...(cachedMaps.incentiveGridMap?.get(`${data.make}|${data.model}|${gridTrim}`.toLowerCase()) || []),
          ...(cachedMaps.incentiveGridMap?.get(`${data.make}|${data.model}|`.toLowerCase()) || []),
          ...(cachedMaps.incentiveGridMap?.get(`${data.make}||`.toLowerCase()) || [])
        ];
        if (incRows.length > 0 || exactLeaseTier || exactFinanceTier) {
          const now = new Date();
          const sumFor = (dealType: string) => {
            // Collect AUTO-APPLIED (OEM_CASH) incentives only — these reduce the advertised
            // payment, mirroring the quote pipeline (IncentiveResolver auto-applies
            // isDefault === OEM_CASH and surfaces non-default [cond:] rebates as opt-in).
            // A catalog card sends no explicit selection, so its payment must reflect only
            // the auto-applied cash, or selectable rebates would undercut card vs calculator.
            const elig: any[] = [];
            for (const inc of incRows) {
              const app = inc.dealApplicability;
              if (app && app !== 'ALL' && app !== dealType) continue;
              if (inc.type !== 'OEM_CASH') continue;
              if (inc.effectiveFrom && new Date(inc.effectiveFrom) > now) continue;
              if (inc.effectiveTo && new Date(inc.effectiveTo) < now) continue;
              const rules = inc.eligibilityRules as any;
              const termRule = rules?.terms || rules?.term;
              if (termRule && Array.isArray(termRule) && !termRule.includes(term)) continue;
              const tierRule = rules?.tiers;
              if (tierRule && Array.isArray(tierRule) && !tierRule.includes(tierId)) continue;
              elig.push(inc);
            }
            // Exclusive groups: keep only the highest-amount item per group, exactly like
            // IncentiveResolver — so multiple manufacturer bonus-cash offers on one car
            // (e.g. Dealer Choice $2,500 + HMA Retail Bonus $2,000) do NOT stack; the best
            // single one applies. Ungrouped OEM_CASH still sum.
            const byGroup = new Map<string, any>();
            const chosen: any[] = [];
            for (const inc of elig) {
              const g = inc.exclusiveGroupId;
              if (!g) { chosen.push(inc); continue; }
              const cur = byGroup.get(g);
              if (!cur || (Number(inc.amountCents) || 0) > (Number(cur.amountCents) || 0)) byGroup.set(g, inc);
            }
            for (const inc of byGroup.values()) chosen.push(inc);
            let taxable = 0, nonTaxable = 0;
            for (const inc of chosen) {
              const amount = Number(inc.amountCents) || 0;
              if (inc.isTaxableCa === false) nonTaxable += amount; else taxable += amount;
            }
            return { taxable, nonTaxable };
          };
          // Card incentive list for a deal type — mirrors DataResolver's mapping so
          // the card and the /api/v2/quote response agree: isDefault === OEM_CASH
          // ([applied], auto-applied, baked into payment); non-default === [cond:]
          // selectable rebates surfaced as available but NOT auto-applied.
          const listFor = (dealType: string): CardIncentive[] => {
            const out: CardIncentive[] = [];
            for (const inc of incRows) {
              const app = inc.dealApplicability;
              if (app && app !== 'ALL' && app !== dealType) continue;
              if (inc.effectiveFrom && new Date(inc.effectiveFrom) > now) continue;
              if (inc.effectiveTo && new Date(inc.effectiveTo) < now) continue;
              const rules = inc.eligibilityRules as any;
              const termRule = rules?.terms || rules?.term;
              if (termRule && Array.isArray(termRule) && !termRule.includes(term)) continue;
              const tierRule = rules?.tiers;
              if (tierRule && Array.isArray(tierRule) && !tierRule.includes(tierId)) continue;
              out.push({
                id: inc.id,
                name: inc.name || 'Manufacturer Incentive',
                amount: (Number(inc.amountCents) || 0) / 100,
                type: inc.type === 'OEM_CASH' ? 'manufacturer' : 'special',
                isDefault: inc.type === 'OEM_CASH'
              });
            }
            return out;
          };
          const leaseSplit = sumFor('LEASE');
          const financeSplit = sumFor('FINANCE');
          leaseTaxableCents = leaseSplit.taxable;
          leaseNonTaxableCents = leaseSplit.nonTaxable;
          financeTaxableCents = financeSplit.taxable;
          financeNonTaxableCents = financeSplit.nonTaxable;
          leaseAvailableIncentives = listFor('LEASE');
          financeAvailableIncentives = listFor('FINANCE');
          // For grid-priced vehicles incentives come from OemIncentiveProgram ONLY —
          // a non-null 0 here blocks the legacy leaseCash/rebates fallback below,
          // which is a stale snapshot the calculator never sees.
          leaseIncentiveCents = leaseTaxableCents + leaseNonTaxableCents;
          financeIncentiveCents = financeTaxableCents + financeNonTaxableCents;
        }

        // When the vehicle is grid-priced, the dealer discount comes from the admin
        // discount manager (DealerAdjustment) — the same source the quote pipeline
        // resolves — instead of legacy savings fields baked into the deal record.
        if (exactLeaseTier || exactFinanceTier || leaseIncentiveCents !== null) {
          const now = new Date();
          const adjs = (cachedMaps.dealerAdjMap?.get(data.make.toLowerCase()) || [])
            .filter((a: any) =>
              new Date(a.startsAt) <= now &&
              (!a.endsAt || new Date(a.endsAt) >= now) &&
              (!a.model || a.model === data.model) &&
              (!a.trim || a.trim === data.trim))
            .sort((a: any, b: any) =>
              // most specific first (trim, then model), then most recent — same
              // priority as DataResolver.resolveDealerDiscount
              (b.trim ? 1 : 0) - (a.trim ? 1 : 0) ||
              (b.model ? 1 : 0) - (a.model ? 1 : 0) ||
              new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
          const adjCents = adjs[0] ? Number(adjs[0].amount) || 0 : 0;
          discount = adjCents / 100;
          savings = discount;
          effectiveDiscount = 0; // discount carries the full admin adjustment
        }
      }

      // carDb rv values are 36-month residuals; apply the same per-term adjustment
      // the calculator's carDb fallback applies (DataResolver), so both paths agree
      // for vehicles the grid does not cover
      if (usedCarDbRates && !exactLeaseTier) {
        if (term === 24) rv += 0.06;
        else if (term === 39) rv -= 0.02;
        else if (term === 42) rv -= 0.04;
        else if (term === 48) rv -= 0.07;
        else if (term === 60) rv -= 0.15;
      }

      if (queryMileage) {
        if (queryMileage === '7.5k' || queryMileage === '7500') rv += 0.01;
        else if (queryMileage === '12k' || queryMileage === '12000') rv -= 0.015;
        else if (queryMileage === '15k' || queryMileage === '15000') rv -= 0.04;
        else if (queryMileage === '20k' || queryMileage === '20000') rv -= 0.05;
      }

      if (queryTier && !usedTiersData && !exactLeaseTier) {
        const adjusted = ModifierEngine.applyTierAdjustment(mf, apr, queryTier);
        mf = adjusted.mf;
      }

      let payment = 0;
      let financePayment = 0;
      const isGridPriced = exactLeaseTier || exactFinanceTier || leaseIncentiveCents !== null;
      // Grid-priced cards use the SAME tax + DMV derivation as the quote pipeline
      // (zip-based tax rate, CA registration estimate from MSRP)
      const dealTaxRate = isGridPriced
        ? getTaxRateByZip((queryParams.zipCode as string) || '90210')
        : (data.taxMonthly && typeof data.taxMonthly === 'number' ? data.taxMonthly : taxRate);
      const dealDmvFeeCents = isGridPriced
        ? Math.round(msrp * 100 * 0.0065) + 20000
        : dmvFeeCents;

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
        // Same incentive treatment as the quote pipeline: non-taxable incentives
        // reduce the selling price; taxable ones flow in as cap cost reduction.
        // Legacy card fields (no grid data) are treated as taxable, as before.
        const taxableIncentivesCents = leaseIncentiveCents !== null
          ? leaseTaxableCents
          : Math.max(leaseCash, manufacturerRebate, rebates) * 100;
        const sellingPriceCents = (msrp - effectiveDiscount - discount) * 100
          - (leaseIncentiveCents !== null ? leaseNonTaxableCents : 0);
        const residualValueCents = rv > 1 ? rv * 100 : Math.round(msrp * rv * 100);

        // $0 due at signing -> sign-and-drive (capitalize first payment + fees), matching
        // the calculator's runPipeline so the card and calculator agree at $0 down too.
        let lease;
        if (leaseDASCents === 0) {
          leaseCCR = 0;
          lease = PureMathEngine.calculateLeaseSignAndDrive({
            msrpCents: msrp * 100,
            sellingPriceCents,
            residualValuePercent: rv > 1 ? rv / msrp : rv,
            moneyFactor: mf,
            term,
            downPaymentCents: taxableIncentivesCents,
            acqFeeCents,
            docFeeCents,
            dmvFeeCents: dealDmvFeeCents,
            brokerFeeCents,
            taxRate: dealTaxRate
          });
        } else {
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
            dmvFeeCents: dealDmvFeeCents,
            brokerFeeCents
          });

          lease = PureMathEngine.calculateLease({
            msrpCents: msrp * 100,
            sellingPriceCents,
            residualValuePercent: rv > 1 ? rv / msrp : rv,
            moneyFactor: mf,
            term,
            downPaymentCents: leaseCCR + taxableIncentivesCents,
            acqFeeCents,
            docFeeCents,
            dmvFeeCents: dealDmvFeeCents,
            brokerFeeCents,
            taxRate: dealTaxRate
          });
        }
        payment = lease.finalPaymentCents / 100;
        
        if (queryTier && !usedTiersData && !exactFinanceTier) {
          const adjusted = ModifierEngine.applyTierAdjustment(0, apr, queryTier);
          apr = adjusted.apr;
        }

        const finance = PureMathEngine.calculateFinance({
          // Finance must use FINANCE incentives, not the lease ones; non-taxable
          // ones reduce the selling price (same as the quote pipeline)
          sellingPriceCents: (msrp - effectiveDiscount - discount) * 100
            - (financeIncentiveCents !== null ? financeNonTaxableCents : 0),
          totalIncentivesCents: financeIncentiveCents !== null
            ? financeTaxableCents
            : Math.max(leaseCash, manufacturerRebate, rebates) * 100,
          apr,
          term,
          downPaymentCents: down * 100,
          docFeeCents,
          dmvFeeCents: dealDmvFeeCents,
          brokerFeeCents,
          taxRate: dealTaxRate
        });
        financePayment = finance.finalPaymentCents / 100;
      }

      // Card display fields (savings badge, incentive list) follow the same
      // term-aware grid incentive used in the payment math above
      if (leaseIncentiveCents !== null) {
        leaseCash = leaseIncentiveCents / 100;
        rebates = leaseIncentiveCents / 100;
      }

      // Finance incentive total for the card badge/savings (auto-applied only — the
      // sum of [applied] finance cash). null for non-grid cards (no finance grid data),
      // letting mapDealsForFrontend fall back to lease-derived numbers as before.
      const financeIncentive = financeIncentiveCents !== null ? financeIncentiveCents / 100 : null;

      return {
        deal, data,
        computed: {
          payment, financePayment, msrp, mf, rv, leaseCash, term, down, savings, discount, rebates, apr, type,
          // Finance-specific savings inputs (grid-priced cards only; null otherwise).
          // The dealer discount is identical for lease & finance (one admin adjustment),
          // so `discount` above is reused; financeIncentive is the finance auto-applied cash.
          financeIncentive,
          // Per-incentive lists (id/name/amount/type/isDefault) for each deal type, so the
          // card can show the right incentives per displayMode. [applied] => isDefault:true
          // (in payment); [cond:] => isDefault:false (selectable, not in payment).
          leaseAvailableIncentives,
          financeAvailableIncentives
        }
      };
    });
  }
}
