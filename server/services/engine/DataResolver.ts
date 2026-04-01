import { QuoteContext } from './types';
import prisma from '../../lib/db';
import { IncentiveResolver } from '../IncentiveResolver';
import { getCarDb } from '../../utils/carDb';

let carDbCache: any = null;
let carDbCacheTime = 0;
const CAR_DB_CACHE_TTL = 60000; // 1 minute

export class DataResolver {
  static async resolveVehicle(context: QuoteContext) {
    let vehicle = null;
    let carDbTrim = null;

    if (context.vehicleId) {
      vehicle = await prisma.vehicleCache.findUnique({ where: { id: context.vehicleId } });
    }

    if (!carDbCache || Date.now() - carDbCacheTime > CAR_DB_CACHE_TTL) {
      carDbCache = await getCarDb();
      carDbCacheTime = Date.now();
    }
    let carDb = carDbCache;

    if (!vehicle) {
      if (context.make && context.model) {
        const makeObj = carDb.makes?.find((m: any) => m.name.toLowerCase() === (context.make || '').toLowerCase());
        if (makeObj) {
          const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === (context.model || '').toLowerCase());
          if (modelObj) {
            carDbTrim = modelObj.trims?.find((t: any) => t.name.toLowerCase() === (context.trim || '').toLowerCase());
            vehicle = {
              make: makeObj.name,
              model: modelObj.name,
              trim: carDbTrim?.name || '',
              year: context.year || new Date().getFullYear(),
              msrpCents: Math.round(Number(carDbTrim?.msrp) || 0) * 100
            };
          }
        }
      }
    }

    const msrpCents = context.adminOverrides?.msrpCents || vehicle?.msrpCents || 0;

    const make = vehicle?.make || context.make || 'Unknown';
    const model = vehicle?.model || context.model || 'Unknown';
    const trim = vehicle?.trim || context.trim || 'Unknown';
    const year = vehicle?.year || context.year || new Date().getFullYear();

    // Fetch incentives from the database
    const dbIncentives = await prisma.oemIncentiveProgram.findMany({
      where: {
        isActive: true,
        status: 'PUBLISHED',
        OR: [
          { make: 'ALL' },
          { make: { equals: make, mode: 'insensitive' } }
        ],
        AND: [
          {
            OR: [
              { model: 'ALL' },
              { model: null },
              { model: '' },
              { model: { equals: model, mode: 'insensitive' } }
            ]
          },
          {
            OR: [
              { trim: 'ALL' },
              { trim: null },
              { trim: '' },
              { trim: { equals: trim, mode: 'insensitive' } }
            ]
          }
        ]
      }
    });

    const formattedIncentives = dbIncentives.map(inc => ({
      id: inc.id,
      name: inc.name,
      amount: inc.amountCents / 100,
      type: inc.type === 'OEM_CASH' ? 'manufacturer' : 'special',
      isDefault: inc.type === 'OEM_CASH',
      expiresAt: inc.effectiveTo ? inc.effectiveTo.toISOString() : undefined,
      stackable: inc.stackable,
      verifiedByAdmin: inc.verifiedByAdmin,
      dbType: inc.type
    }));

    return {
      ...vehicle,
      make,
      model,
      trim,
      year,
      msrpCents: msrpCents > 0 ? msrpCents : null,
      availableIncentives: formattedIncentives
    };
  }

  static async resolvePrograms(context: QuoteContext, vehicle: any) {
    if (context.adminOverrides?.mf || context.adminOverrides?.apr) {
      return [{
        id: 'admin-override',
        lender: { name: 'Admin Override' },
        mf: context.adminOverrides.mf || 0.002,
        apr: context.adminOverrides.apr || 5.0,
        rv: context.adminOverrides.rv || 0.55,
        rebates: 0
      }];
    }

    const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
    if (!activeBatch) {
      console.log('No active batch found');
      return [];
    }

    console.log('Querying bank programs with:', {
      batchId: activeBatch.id,
      programType: context.quoteType,
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim,
      year: vehicle.year,
      term: context.term,
      mileage: context.mileage
    });

    let bankPrograms = await prisma.bankProgram.findMany({
      where: {
        batchId: activeBatch.id,
        programType: context.quoteType,
        make: { in: [vehicle.make, 'ALL', ''] },
        model: { in: [vehicle.model, 'ALL', ''] },
        trim: { in: [vehicle.trim, 'ALL', ''] },
        year: { in: [vehicle.year, 0] },
        term: context.term,
        ...(context.quoteType === 'LEASE' ? { mileage: 10000 } : {})
      },
      include: {
        lender: { include: { eligibilityRules: true } },
        batch: true
      }
    });

    console.log(`Found ${bankPrograms.length} bank programs`);
    if (bankPrograms.length === 0) {
      console.log('NO PROGRAMS FOUND. Debug info:', {
        batchId: activeBatch.id,
        programType: context.quoteType,
        make: vehicle.make,
        model: vehicle.model,
        trim: vehicle.trim,
        year: vehicle.year,
        term: context.term,
        mileage: context.mileage
      });
      return [];
    }

    // Apply Program Overrides
    const overrides = await prisma.programOverride.findMany({
      where: {
        isActive: true,
        OR: [
          { make: vehicle.make, model: vehicle.model },
          { make: vehicle.make, model: null },
          { make: vehicle.make, model: '' },
          { make: null, model: null },
          { make: '', model: '' }
        ]
      }
    });

    if (overrides.length > 0) {
      bankPrograms = bankPrograms.map(program => {
        // Find the most specific override for this program's bank
        const applicableOverrides = overrides.filter(o => !o.bankId || o.bankId === program.lenderId);
        if (applicableOverrides.length === 0) return program;

        // Sort by specificity: make + model > make > global
        applicableOverrides.sort((a, b) => {
          const scoreA = (a.make ? 1 : 0) + (a.model ? 1 : 0);
          const scoreB = (b.make ? 1 : 0) + (b.model ? 1 : 0);
          return scoreB - scoreA;
        });

        const bestOverride = applicableOverrides[0];
        
        return {
          ...program,
          mf: bestOverride.mfMarkup !== null && program.mf !== null ? Number(program.mf) + Number(bestOverride.mfMarkup) : program.mf,
          apr: bestOverride.aprMarkup !== null && program.apr !== null ? Number(program.apr) + Number(bestOverride.aprMarkup) : program.apr,
          _overrideApplied: bestOverride.id // For audit
        };
      });
    }

    return bankPrograms;
  }

  static async resolveSettings() {
    const settingsRecord = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    let settings: any = {
      brokerFee: 595,
      taxRateDefault: 8.875,
      dmvFee: 400,
      docFee: 85,
      acquisitionFee: 650,
      routingStrategy: 'BEST_FOR_CUSTOMER'
    };
    if (settingsRecord && settingsRecord.data) {
      try {
        settings = { ...settings, ...JSON.parse(settingsRecord.data) };
      } catch (e) {}
    }
    return {
      taxRate: (Number(settings.taxRateDefault) || 8.875) / 100,
      acqFeeCents: (Number(settings.acquisitionFee) || 650) * 100,
      docFeeCents: (Number(settings.docFee) || 85) * 100,
      dmvFeeCents: (Number(settings.dmvFee) || 400) * 100,
      brokerFeeCents: (Number(settings.brokerFee) || 595) * 100,
      routingStrategy: settings.routingStrategy || 'BEST_FOR_CUSTOMER'
    };
  }
  
  static async resolveDealerDiscount(context: QuoteContext, vehicle: any) {
    if (context.isStandalone) {
      return 0; // Standalone calculator uses MSRP without dealer discounts
    }

    if (context.adminOverrides?.dealerDiscountCents !== undefined) {
      return context.adminOverrides.dealerDiscountCents;
    }

    const now = new Date();
    const dealerAdjustment = await prisma.dealerAdjustment.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        OR: [ { endsAt: null }, { endsAt: { gte: now } } ],
        make: vehicle.make,
        model: { in: [vehicle.model, '', null] },
        trim: { in: [vehicle.trim, '', null] }
      },
      orderBy: [
        { trim: 'desc' }, // Prioritize specific trim
        { model: 'desc' }, // Prioritize specific model
        { startsAt: 'desc' }
      ]
    });

    return dealerAdjustment ? dealerAdjustment.amount : 0;
  }

  static async resolveIncentives(context: QuoteContext, vehicle: any) {
    const resolvedIncentives = IncentiveResolver.resolve(
      vehicle.availableIncentives || [], 
      context.selectedIncentiveIds, 
      'customer', 
      context.isFirstTimeBuyer,
      context,
      vehicle
    );
    return resolvedIncentives.totalRebateCents || 0;
  }
}
