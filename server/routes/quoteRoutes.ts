import express from 'express';
import db from '../lib/db';
import { LeaseCalculationEngine, FinanceCalculationEngine } from '../services/CalculationEngine';
import { IncentiveResolver } from '../services/IncentiveResolver';
import { ProgramResolver } from '../services/ProgramResolver';

const router = express.Router();

/**
 * POST /api/v2/quote
 * Основной эндпоинт для расчета предложения на странице автомобиля (VDP).
 */
router.post('/quote', async (req, res) => {
  try {
    const body = req.body.config ? { ...req.body, ...req.body.config } : req.body;

    const vehicleId = body.vehicleId;
    const quoteType = (body.type?.toUpperCase() === 'LEASE' || body.quoteType === 'LEASE') ? 'LEASE' : 'FINANCE';
    const term = parseInt(body.term) || 36;
    const mileage = parseInt(body.annualMileage || body.mileage) || 10000;
    
    // In LEASE, downPayment is often used as dueAtSigning by the frontend
    const downPaymentValue = body.downPayment !== undefined ? parseInt(body.downPayment) : (body.downPaymentCents !== undefined ? parseInt(body.downPaymentCents) / 100 : 5000);
    const dueAtSigningCents = body.dueAtSigningCents !== undefined ? parseInt(body.dueAtSigningCents) : (downPaymentValue * 100);
    const downPaymentCents = downPaymentValue * 100;

    // We need to get the vehicle details from the DB using vehicleId
    // For MVP, assume we can fetch it from vehicleCache
    let vehicle = null;
    if (vehicleId) {
      vehicle = await db.vehicleCache.findUnique({
        where: { id: vehicleId }
      });
    }

    // Try to get from carDb if not found
    let carDbVehicle = null;
    let carDbTrim = null;
    let carDbMake = null;
    if (!vehicle) {
      const record = await db.siteSettings.findUnique({ where: { id: 'car_db' } });
      if (record) {
        const carDb = JSON.parse(record.data);
        if (body.make && body.model) {
          const makeObj = carDb.makes?.find((m: any) => m.name.toLowerCase() === (body.make || '').toLowerCase());
          if (makeObj) {
            carDbMake = makeObj;
            const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === (body.model || '').toLowerCase());
            if (modelObj) {
              carDbVehicle = modelObj;
              carDbTrim = modelObj.trims?.find((t: any) => t.name.toLowerCase() === (body.trim || '').toLowerCase());
              console.log("Found modelObj, trim:", body.trim, "carDbTrim:", carDbTrim?.name);
            }
          }
        } else {
          // Search by vehicleId
          for (const make of carDb.makes || []) {
            for (const model of make.models || []) {
              for (const trim of model.trims || []) {
                if (trim.id === vehicleId) {
                  carDbMake = make;
                  carDbVehicle = model;
                  carDbTrim = trim;
                  break;
                }
              }
              if (carDbTrim) break;
            }
            if (carDbTrim) break;
          }
        }
      }
    }

    if (!vehicle) {
      // Fallback to mock vehicle if not found in DB
      const mockId = vehicleId || `mock-${Date.now()}`;
      vehicle = await db.vehicleCache.upsert({
        where: { id: mockId },
        update: {},
        create: {
          id: mockId,
          make: carDbMake?.name || body.make || 'Toyota',
          model: carDbVehicle?.name || body.model || 'Camry',
          trim: carDbTrim?.name || body.trim || 'LE',
          year: 2026,
          msrpCents: (carDbTrim?.msrp || body.msrp || 30000) * 100,
          bodyStyle: 'Sedan',
          features: '[]',
          isActive: true
        }
      });
    }

    // 1. Find ACTIVE batch
    const activeBatch = await db.programBatch.findFirst({
      where: { status: 'ACTIVE' }
    });

    // Resolve incentives
    const availableIncentives = carDbTrim?.availableIncentives || [];
    const selectedIncentives = body.selectedIncentives || [];
    const isFirstTimeBuyer = body.isFirstTimeBuyer || false;
    const hasCosigner = body.hasCosigner || false;
    // For MVP, assume role is customer unless specified
    const resolvedIncentives = IncentiveResolver.resolve(availableIncentives, selectedIncentives, 'customer', isFirstTimeBuyer);
    const totalRebatesCents = resolvedIncentives.totalRebateCents;

    // 2. Find BankPrograms (Multiple)
    let bankPrograms: any[] = [];
    if (activeBatch) {
      bankPrograms = await db.bankProgram.findMany({
        where: {
          batchId: activeBatch.id,
          programType: quoteType,
          make: vehicle.make,
          model: vehicle.model,
          year: vehicle.year,
          term: term,
          ...(quoteType === 'LEASE' ? { mileage: mileage } : {})
        },
        include: {
          lender: {
            include: {
              eligibilityRules: true
            }
          }
        }
      });
      
      // Filter programs based on lender eligibility rules
      bankPrograms = bankPrograms.filter(program => {
        if (!program.lender || !program.lender.eligibilityRules || program.lender.eligibilityRules.length === 0) {
          return true; // No rules, allow by default
        }
        
        const rules = program.lender.eligibilityRules;
        const make = vehicle.make || '';
        const model = vehicle.model || '';
        const dealType = quoteType; // LEASE or FINANCE
        
        // Find the most specific rule
        let matchedRule = rules.find((r: any) => 
          r.make.toLowerCase() === make.toLowerCase() && 
          r.model.toLowerCase() === model.toLowerCase() && 
          r.dealApplicability === dealType
        );
        
        if (!matchedRule) {
          matchedRule = rules.find((r: any) => 
            r.make.toLowerCase() === make.toLowerCase() && 
            r.model === 'ALL' && 
            r.dealApplicability === dealType
          );
        }
        
        if (!matchedRule) {
          matchedRule = rules.find((r: any) => 
            r.make.toLowerCase() === make.toLowerCase() && 
            r.model.toLowerCase() === model.toLowerCase() && 
            r.dealApplicability === 'ALL'
          );
        }
        
        if (!matchedRule) {
          matchedRule = rules.find((r: any) => 
            r.make.toLowerCase() === make.toLowerCase() && 
            r.model === 'ALL' && 
            r.dealApplicability === 'ALL'
          );
        }
        
        if (matchedRule) {
          if (isFirstTimeBuyer) {
            if (!matchedRule.allowFirstTimeBuyer) {
              return false; // Reject if FTB is not allowed at all
            }
            if (hasCosigner && !matchedRule.allowWithCoSigner) {
              return false; // Reject if FTB has cosigner but it's not allowed
            }
          }
          // Add other checks here if needed (e.g., requiresEstablishedCredit)
        }
        
        return true;
      });
    }

    if (bankPrograms.length === 0) {
      if (body.rv || body.mf || body.apr) {
        // Use deal's own data from the request
        bankPrograms.push({
          id: 'deal-specific',
          lender: { name: 'Deal Specific Lender' },
          programType: quoteType,
          term: term,
          mileage: mileage,
          rv: body.rv || 0.55,
          mf: body.mf || 0.002,
          apr: body.apr || 4.9,
          rebates: 0
        });
      } else {
        return res.json({
          status: 'NO_PROGRAMS_AVAILABLE',
          message: 'No active lease/finance programs found for this vehicle.',
          quote: null
        });
      }
    }

    // 3. Find active DealerAdjustment
    const now = new Date();
    const dealerAdjustment = await db.dealerAdjustment.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [
          { endsAt: null },
          { endsAt: { gte: now } }
        ],
        make: vehicle.make,
        model: vehicle.model,
      },
      orderBy: { startsAt: 'desc' }
    });

    const adjustmentAmountCents = body.savings !== undefined ? -(body.savings * 100) : (dealerAdjustment ? dealerAdjustment.amount : 0);

    // 4. Fetch Settings for Fees
    const settingsRecord = await db.siteSettings.findUnique({ where: { id: 'global' } });
    const settings = settingsRecord ? JSON.parse(settingsRecord.data) : {
      brokerFee: 595,
      taxRateDefault: 8.875,
      dmvFee: 400,
      docFee: 85,
      acquisitionFee: 650
    };

    const acqFeeCents = (quoteType === 'LEASE' ? (settings.acquisitionFee || 650) : 0) * 100;
    const docFeeCents = (settings.docFee || 85) * 100;
    const dmvFeeCents = (settings.dmvFee || 400) * 100;
    const brokerFeeCents = (settings.brokerFee || 595) * 100;
    const taxRate = (settings.taxRateDefault || 8.875) / 100;
    
    const queryTier = body.tier || req.query.tier;
    const zipCode = body.zipCode || req.query.zipCode;
    const isDefaultTaxUsed = true; // We are using default tax rate from settings

    // 5. Calculate Math for all programs
    const msrpCents = body.msrp ? body.msrp * 100 : vehicle.msrpCents;
    const results = bankPrograms.map(bankProgram => {
      // bankProgram.rebates is already stored in cents in the database
      const bankRebatesCents = bankProgram.rebates || 0;
      const leaseCashCents = (quoteType === 'LEASE' && body.leaseCash) ? body.leaseCash * 100 : 0;
      const combinedRebatesCents = bankRebatesCents + totalRebatesCents + leaseCashCents;
      const sellingPriceCents = msrpCents + adjustmentAmountCents - combinedRebatesCents;
      let finalPaymentCents = 0;
      let residualValueCents = 0;
      let totalFeesCents = acqFeeCents + docFeeCents + dmvFeeCents + brokerFeeCents;

      let parsedMf = body.mf !== undefined ? parseFloat(String(body.mf)) : undefined;
      let parsedApr = body.apr !== undefined ? parseFloat(String(body.apr)) : undefined;
      let parsedRv = body.rv !== undefined ? parseFloat(String(body.rv).replace('%', '')) : undefined;
      if (parsedRv !== undefined && parsedRv > 1) parsedRv = parsedRv / 100;

      let mf = parsedMf !== undefined ? parsedMf : (bankProgram.mf || 0);
      let apr = parsedApr !== undefined ? parsedApr : (bankProgram.apr || 0);
      let rv = parsedRv !== undefined ? parsedRv : (bankProgram.rv || 0);

      if (parsedRv !== undefined) {
        // Adjust for mileage if using body.rv
        if (mileage === 12000) rv -= 0.01;
        else if (mileage === 15000) rv -= 0.03;
        else if (mileage === 20000) rv -= 0.05;
        else if (mileage === 7500) rv += 0.01;
      }

      if (queryTier && !body.usedTiersData) {
        if (queryTier === 't2') { mf *= 1.1; apr += 1.0; }
        else if (queryTier === 't3') { mf *= 1.2; apr += 2.5; }
        else if (queryTier === 't4') { mf *= 1.35; apr += 4.5; }
        else if (queryTier === 't5') { mf *= 1.5; apr += 7.0; }
        else if (queryTier === 't6') { mf *= 1.7; apr += 10.0; }
      }

      if (quoteType === 'LEASE') {
        const rvPercent = rv > 1 ? rv / 100 : rv;
        const leaseResult = LeaseCalculationEngine.calculate({
          msrpCents: msrpCents,
          sellingPriceCents,
          residualValuePercent: rvPercent,
          moneyFactor: mf,
          term,
          dueAtSigningCents,
          acqFeeCents,
          docFeeCents,
          dmvFeeCents,
          brokerFeeCents,
          taxRate
        });
        
        finalPaymentCents = leaseResult.finalPaymentCents;
        residualValueCents = leaseResult.residualValueCents;
        totalFeesCents = leaseResult.totalFeesCents;
      } else {
        // FINANCE
        const financeResult = FinanceCalculationEngine.calculate({
          msrpCents: msrpCents,
          sellingPriceCents,
          apr: apr,
          term,
          downPaymentCents,
          docFeeCents,
          dmvFeeCents,
          brokerFeeCents,
          taxRate
        });
        
        finalPaymentCents = financeResult.finalPaymentCents;
        totalFeesCents = financeResult.totalFeesCents;
      }

      return {
        bankProgram,
        finalPaymentCents,
        sellingPriceCents,
        residualValueCents,
        totalFeesCents,
        combinedRebatesCents,
        mf,
        apr,
        rv
      };
    });

    // Sort by payment and pick best for each type
    const bestByLenderType: Record<string, any> = {};
    results.forEach(res => {
      const type = res.bankProgram.lender?.lenderType || 'NATIONAL_BANK';
      if (!bestByLenderType[type] || res.finalPaymentCents < bestByLenderType[type].finalPaymentCents) {
        bestByLenderType[type] = res;
      }
    });

    // Pick the overall best as the main quote
    const bestResult = results.sort((a, b) => a.finalPaymentCents - b.finalPaymentCents)[0];

    // 6. Save Quote Snapshot for the best one
    const quoteSnapshot = await db.quoteSnapshot.create({
      data: {
        vehicleId: vehicle.id,
        surface: 'VDP',
        quoteType,
        quoteStatus: 'CALCULATED',
        confidenceLevel: 'HIGH',
        usedFallbackFlags: JSON.stringify([]),
        manualReviewFlags: JSON.stringify([]),
        isDefaultCatalogScenario: false,
        monthlyPaymentCents: bestResult.finalPaymentCents,
        effectiveDasOrDownCents: quoteType === 'LEASE' ? dueAtSigningCents : downPaymentCents,
        totalSavingsCents: adjustmentAmountCents + bestResult.combinedRebatesCents,
        lenderId: bestResult.bankProgram.lenderId === 'mock-lender' ? null : bestResult.bankProgram.lenderId,
        auditPayload: JSON.stringify({
          programBatchId: activeBatch?.id || null,
          make: vehicle.make,
          model: vehicle.model,
          trim: vehicle.trim || '',
          year: vehicle.year,
          term: term,
          mileage: quoteType === 'LEASE' ? mileage : null,
          msrp: vehicle.msrpCents,
          sellingPrice: bestResult.sellingPriceCents,
          mf: bestResult.mf,
          apr: bestResult.apr,
          residual: bestResult.rv,
          rebatesCents: bestResult.combinedRebatesCents,
          dealerAdjustment: adjustmentAmountCents,
          fees: {
            acqFeeCents,
            docFeeCents,
            dmvFeeCents,
            brokerFeeCents
          },
          taxRate
        })
      }
    });

    // Calculate TCO
    const insurancePerMonthCents = 15000;
    const maintenancePerMonthCents = 5000;
    const registrationPerYearCents = 40000;
    const totalLeasePaymentsCents = bestResult.finalPaymentCents * term;
    const totalInsuranceCents = insurancePerMonthCents * term;
    const totalMaintenanceCents = maintenancePerMonthCents * term;
    const totalRegistrationCents = (registrationPerYearCents / 12) * term;
    const dueAtSigningCentsTco = quoteType === 'LEASE' ? dueAtSigningCents : downPaymentCents;
    const totalCostCents = totalLeasePaymentsCents + dueAtSigningCentsTco + totalInsuranceCents + totalMaintenanceCents + totalRegistrationCents;

    // 7. Return result in the format expected by the frontend
    res.json({
      monthlyPayment: bestResult.finalPaymentCents / 100,
      totalDueAtSigning: (quoteType === 'LEASE' ? dueAtSigningCents : downPaymentCents) / 100,
      quoteType,
      vehicle: {
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        msrp: vehicle.msrpCents / 100,
      },
      lender: bestResult.bankProgram.lender?.name || 'MVP Bank',
      lenderType: bestResult.bankProgram.lender?.lenderType || 'NATIONAL_BANK',
      options: Object.entries(bestByLenderType).map(([type, res]) => ({
        lenderType: type,
        lenderName: res.bankProgram.lender?.name || 'Bank',
        monthlyPayment: res.finalPaymentCents / 100,
        isBest: res.finalPaymentCents === bestResult.finalPaymentCents
      })),
      calculation: {
        monthlyPaymentCents: bestResult.finalPaymentCents,
        totalDueAtSigningCents: quoteType === 'LEASE' ? dueAtSigningCents : downPaymentCents,
        msrpCents: vehicle.msrpCents,
        sellingPriceCents: bestResult.sellingPriceCents,
        residualValueCents: bestResult.residualValueCents,
        dealerDiscountCents: -adjustmentAmountCents,
        incentivesCents: bestResult.combinedRebatesCents,
        fees: [
          { name: 'Acquisition Fee', amountCents: acqFeeCents },
          { name: 'Doc Fee', amountCents: docFeeCents },
          { name: 'DMV Fee', amountCents: dmvFeeCents },
          { name: 'Broker Fee', amountCents: brokerFeeCents }
        ],
        taxRate,
        quoteId: quoteSnapshot.id
      },
      tco: {
        totalCostCents,
        monthlyAverageCents: Math.round(totalCostCents / term),
        breakdownCents: {
          lease: totalLeasePaymentsCents + dueAtSigningCentsTco,
          insurance: totalInsuranceCents,
          maintenance: totalMaintenanceCents,
          registration: totalRegistrationCents
        }
      },
      metadata: {
        zipCode: zipCode || '90210',
        isDefaultTaxUsed,
        salesTaxRate: taxRate,
        tier: queryTier || 'TIER_1_PLUS',
        debug: {
          make: body.make,
          model: body.model,
          trim: body.trim,
          carDbMake: carDbMake?.name,
          carDbVehicle: carDbVehicle?.name,
          carDbTrim: carDbTrim?.name,
          bankProgram: bestResult.bankProgram
        }
      }
    });

  } catch (error: any) {
    console.error('Quote calculation error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/v2/quotes
 * Возвращает список предрасчитанных предложений для каталога.
 */
router.get('/quotes', async (req, res) => {
  try {
    // For MVP, just return empty array or mock snapshots
    res.json([]);
  } catch (error: any) {
    console.error('Failed to fetch quote snapshots:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
