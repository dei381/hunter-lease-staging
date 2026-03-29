import { QuoteContext } from './types';
import prisma from '../../lib/db';
import { IncentiveResolver } from '../IncentiveResolver';

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
      const record = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
      carDbCache = record && record.data ? JSON.parse(record.data) : { makes: [] };
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

    return {
      ...vehicle,
      make: vehicle?.make || context.make || 'Unknown',
      model: vehicle?.model || context.model || 'Unknown',
      trim: vehicle?.trim || context.trim || 'Unknown',
      year: vehicle?.year || context.year || new Date().getFullYear(),
      msrpCents: msrpCents > 0 ? msrpCents : null,
      availableIncentives: carDbTrim?.availableIncentives || []
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
    if (!activeBatch) return [];

    let bankPrograms = await prisma.bankProgram.findMany({
      where: {
        batchId: activeBatch.id,
        programType: context.quoteType,
        make: { in: [vehicle.make, 'ALL', ''] },
        model: { in: [vehicle.model, 'ALL', ''] },
        trim: { in: [vehicle.trim, 'ALL', ''] },
        year: { in: [vehicle.year, 0] },
        term: context.term,
        ...(context.quoteType === 'LEASE' ? { mileage: context.mileage } : {})
      },
      include: {
        lender: { include: { eligibilityRules: true } }
      }
    });

    return bankPrograms;
  }

  static async resolveSettings() {
    const settingsRecord = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
    let settings = {
      brokerFee: 595,
      taxRateDefault: 8.875,
      dmvFee: 400,
      docFee: 85,
      acquisitionFee: 650
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
      brokerFeeCents: (Number(settings.brokerFee) || 595) * 100
    };
  }
  
  static async resolveDealerDiscount(context: QuoteContext, vehicle: any) {
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
        model: vehicle.model,
      },
      orderBy: { startsAt: 'desc' }
    });

    return dealerAdjustment ? dealerAdjustment.amount : 0;
  }

  static async resolveIncentives(context: QuoteContext, vehicle: any) {
    const resolvedIncentives = IncentiveResolver.resolve(
      vehicle.availableIncentives || [], 
      context.selectedIncentiveIds, 
      'customer', 
      context.isFirstTimeBuyer
    );
    return resolvedIncentives.totalRebateCents || 0;
  }
}
