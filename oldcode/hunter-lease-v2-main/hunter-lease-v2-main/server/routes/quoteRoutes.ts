import express from 'express';
import db from '../lib/db';

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
    let vehicle = await db.vehicleCache.findUnique({
      where: { id: vehicleId }
    });

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
      vehicle = {
        id: vehicleId,
        make: carDbMake?.name || body.make || 'Toyota',
        model: carDbVehicle?.name || body.model || 'Camry',
        trim: carDbTrim?.name || body.trim || 'LE',
        year: 2025,
        msrpCents: (carDbTrim?.msrp || body.msrp || 30000) * 100,
        bodyStyle: 'Sedan',
        features: '[]',
        isActive: true,
        updatedAt: new Date(),
        vin: null
      };
    }

    // 1. Find ACTIVE batch
    const activeBatch = await db.programBatch.findFirst({
      where: { status: 'ACTIVE' }
    });

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
          lender: true
        }
      });
    }

    if (bankPrograms.length === 0) {
      // Fallback to mock bank program or carDb data
      bankPrograms = [{
        id: 'mock-program',
        batchId: 'mock-batch',
        lenderId: 'mock-lender',
        lender: { name: 'MVP Bank', lenderType: 'NATIONAL_BANK' },
        programType: quoteType,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        year: vehicle.year,
        term: term,
        mileage: mileage,
        rv: carDbTrim?.rv36 || body.rv || 55, // 55% residual
        mf: carDbTrim?.mf || body.mf || 0.002, // Money factor
        apr: carDbTrim?.baseAPR || body.apr || 4.9, // APR
        rebates: (carDbTrim?.leaseCash || body.rebates || 1000) * 100 // $1000 rebate
      }];
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

    const adjustmentAmountCents = dealerAdjustment ? dealerAdjustment.amount : 0;

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

    // 5. Calculate Math for all programs
    const results = bankPrograms.map(bankProgram => {
      const sellingPriceCents = vehicle.msrpCents + adjustmentAmountCents - bankProgram.rebates;
      let finalPaymentCents = 0;
      let residualValueCents = 0;
      let totalFeesCents = acqFeeCents + docFeeCents + dmvFeeCents + brokerFeeCents;

      if (quoteType === 'LEASE') {
        const rvPercent = (bankProgram.rv || 0) > 1 ? (bankProgram.rv || 0) / 100 : (bankProgram.rv || 0);
        residualValueCents = Math.round(vehicle.msrpCents * rvPercent);
        
        const depreciationCents = (sellingPriceCents + totalFeesCents - dueAtSigningCents) - residualValueCents;
        const basePaymentCents = depreciationCents / term;
        const rentChargeCents = (sellingPriceCents + totalFeesCents + residualValueCents) * (bankProgram.mf || 0);
        const monthlyPaymentPreTaxCents = basePaymentCents + rentChargeCents;
        finalPaymentCents = Math.round(monthlyPaymentPreTaxCents * (1 + taxRate));
      } else {
        // FINANCE
        const principalCents = sellingPriceCents + totalFeesCents - downPaymentCents;
        const monthlyRate = (bankProgram.apr || 0) / 100 / 12;
        if (monthlyRate === 0) {
          finalPaymentCents = Math.round(principalCents / term);
        } else {
          finalPaymentCents = Math.round(
            (principalCents * monthlyRate * Math.pow(1 + monthlyRate, term)) /
            (Math.pow(1 + monthlyRate, term) - 1)
          );
        }
      }

      return {
        bankProgram,
        finalPaymentCents,
        sellingPriceCents,
        residualValueCents,
        totalFeesCents
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
    const quote = await db.quote.create({
      data: {
        programBatchId: activeBatch?.id || null,
        programType: quoteType,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim || '',
        year: vehicle.year,
        term: term,
        mileage: quoteType === 'LEASE' ? mileage : null,
        msrp: vehicle.msrpCents,
        sellingPrice: bestResult.sellingPriceCents,
        downPayment: quoteType === 'LEASE' ? dueAtSigningCents : downPaymentCents,
        mf: bestResult.bankProgram.mf,
        apr: bestResult.bankProgram.apr,
        residual: bestResult.bankProgram.rv,
        rebates: bestResult.bankProgram.rebates,
        dealerAdjustment: adjustmentAmountCents,
        finalPayment: bestResult.finalPaymentCents,
        lenderId: bestResult.bankProgram.lenderId
      }
    });

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
        incentivesCents: bestResult.bankProgram.rebates,
        fees: [
          { name: 'Acquisition Fee', amountCents: acqFeeCents },
          { name: 'Doc Fee', amountCents: docFeeCents },
          { name: 'DMV Fee', amountCents: dmvFeeCents },
          { name: 'Broker Fee', amountCents: brokerFeeCents }
        ],
        taxRate,
        quoteId: quote.id
      },
      metadata: {
        zipCode: body.zipCode || '90210',
        salesTaxRate: taxRate,
        tier: 'TIER_1_PLUS',
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
