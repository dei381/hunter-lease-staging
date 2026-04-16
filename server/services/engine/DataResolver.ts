import { QuoteContext } from './types';
import prisma from '../../lib/db';
import { IncentiveResolver } from '../IncentiveResolver';
import { getCarDb } from '../../utils/carDb';
import admin from 'firebase-admin';

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  try {
    admin.initializeApp();
  } catch (e) {
    console.error('Firebase Admin initialization failed in DataResolver:', e);
  }
}

let carDbCache: any = null;
let carDbCacheTime = 0;
const CAR_DB_CACHE_TTL = 60000; // 1 minute

export class DataResolver {
  static async resolveVehicle(context: QuoteContext) {
    let vehicle: any = null;
    let carDbTrim = null;
    let isMarketcheck = false;

    // 1. Try to resolve from local DB
    if (context.vehicleId) {
      vehicle = await prisma.vehicleCache.findUnique({ where: { id: context.vehicleId } });
      if (!vehicle) {
        const deal = await prisma.dealRecord.findUnique({ where: { id: context.vehicleId } });
        if (deal) {
          try {
            const fd = JSON.parse(deal.financialData || '{}');
            vehicle = {
              make: fd.make || context.make || 'Unknown',
              model: fd.model || context.model || 'Unknown',
              trim: fd.trim || context.trim || 'Unknown',
              year: fd.year ? Number(fd.year) : (context.year ? Number(context.year) : new Date().getFullYear()),
              msrpCents: fd.msrp ? Math.round(Number(fd.msrp) * 100) : 0
            };
          } catch (e) {
            console.error("Failed to parse DealRecord financialData", e);
          }
        }
      }

      // 2. If still not found, try Firestore (Marketcheck)
      if (!vehicle) {
        try {
          const db = admin.firestore();
          const mcDoc = await db.collection('mc_inventory').doc(context.vehicleId).get();
          if (mcDoc.exists) {
            const mcData = mcDoc.data()!;
            vehicle = {
              make: mcData.make,
              model: mcData.model,
              trim: mcData.trim || mcData.heading,
              year: Number(mcData.year),
              msrpCents: mcData.msrp ? Math.round(Number(mcData.msrp) * 100) : 0,
              zip: mcData.dealer?.zip?.split('-')[0]
            };
            isMarketcheck = true;
          }
        } catch (e) {
          console.error("Failed to fetch vehicle from Firestore", e);
        }
      }
    }

    if (!carDbCache || Date.now() - carDbCacheTime > CAR_DB_CACHE_TTL) {
      carDbCache = await getCarDb();
      carDbCacheTime = Date.now();
    }
    let carDb = carDbCache;

    // Always try to normalize trim and msrp using carDb
    if (vehicle?.make && vehicle?.model) {
      const makeObj = carDb.makes?.find((m: any) => m.name.toLowerCase() === vehicle.make.toLowerCase());
      if (makeObj) {
        const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === vehicle.model.toLowerCase());
        if (modelObj) {
          const trimToSearch = vehicle.trim || '';
          const exactMatch = modelObj.trims?.find((t: any) => t.name.toLowerCase() === trimToSearch.toLowerCase());
          const wordMatch = modelObj.trims?.find((t: any) => new RegExp(`\\b${trimToSearch}\\b`, 'i').test(t.name));
          const partialMatch = modelObj.trims?.find((t: any) => t.name.toLowerCase().includes(trimToSearch.toLowerCase()));
          
          carDbTrim = exactMatch || wordMatch || partialMatch;
          
          if (carDbTrim) {
            vehicle.trim = carDbTrim.name;
            if (!vehicle.msrpCents) {
              vehicle.msrpCents = Math.round(Number(carDbTrim.msrp) || 0) * 100;
            }
          }
        }
      }
    }

    if (!vehicle) {
      if (context.make && context.model) {
        const makeObj = carDb.makes?.find((m: any) => m.name.toLowerCase() === (context.make || '').toLowerCase());
        if (makeObj) {
          const modelObj = makeObj.models?.find((m: any) => m.name.toLowerCase() === (context.model || '').toLowerCase());
          if (modelObj) {
            const trimToMatch = context.trim || '';
            const exactMatch = modelObj.trims?.find((t: any) => t.name.toLowerCase() === trimToMatch.toLowerCase());
            const wordMatch = modelObj.trims?.find((t: any) => new RegExp(`\\b${trimToMatch}\\b`, 'i').test(t.name));
            const partialMatch = modelObj.trims?.find((t: any) => t.name.toLowerCase().includes(trimToMatch.toLowerCase()));
            
            carDbTrim = exactMatch || wordMatch || partialMatch;
            
            vehicle = {
              make: makeObj.name,
              model: modelObj.name,
              trim: carDbTrim?.name || context.trim || '',
              year: context.year ? Number(context.year) : new Date().getFullYear(),
              msrpCents: Math.round(Number(carDbTrim?.msrp) || 0) * 100
            };
          }
        }
      }
    }

    const msrpCents = context.adminOverrides?.msrpCents || context.marketcheckData?.msrpCents || vehicle?.msrpCents || 0;
    const make = vehicle?.make || context.make || 'Unknown';
    const model = vehicle?.model || context.model || 'Unknown';
    const trim = vehicle?.trim || context.trim || 'Unknown';
    const year = Number(vehicle?.year) || Number(context.year) || new Date().getFullYear();

    // If we only have marketcheck data and no vehicle object, create a dummy one
    if (!vehicle && context.marketcheckData?.msrpCents) {
      vehicle = {
        make,
        model,
        trim,
        year,
        msrpCents: context.marketcheckData.msrpCents
      };
    }

    // 3. Fetch incentives
    let formattedIncentives: any[] = [];

    // 3a. From local DB
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

    formattedIncentives = dbIncentives.map(inc => ({
      id: inc.id,
      name: inc.name,
      amount: inc.amountCents / 100,
      type: inc.type === 'conditional' ? 'special' : 'manufacturer',
      isDefault: inc.type !== 'conditional',
      expiresAt: inc.effectiveTo ? inc.effectiveTo.toISOString() : undefined,
      stackable: inc.stackable,
      isTaxableCa: inc.isTaxableCa,
      verifiedByAdmin: inc.verifiedByAdmin,
      dbType: inc.type
    }));

    // 3b. From Firestore (Marketcheck)
    if (isMarketcheck || context.marketcheckData) {
      try {
        const zip = vehicle?.zip || context.zipCode || '90210';
        const db = admin.firestore();
        const mcIncDoc = await db.collection('mc_incentives').doc(`${make.toLowerCase()}_${zip}`).get();
        if (mcIncDoc.exists) {
          const mcIncentives = mcIncDoc.data()?.incentives || [];
          const mcFormatted = mcIncentives.map((inc: any) => ({
            id: inc.id || `mc-${Math.random().toString(36).substr(2, 9)}`,
            name: inc.title || inc.name,
            amount: inc.amount || 0,
            type: 'manufacturer',
            isDefault: true,
            source: 'marketcheck'
          }));
          formattedIncentives = [...formattedIncentives, ...mcFormatted];
        }
      } catch (e) {
        console.error("Failed to fetch incentives from Firestore", e);
      }
    }

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
        lender: { name: 'Admin Override', lenderType: 'ADMIN' },
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

    const isHybrid = vehicle.trim.toLowerCase().includes('hybrid');
    const possibleModels = Array.from(new Set([
      vehicle.model,
      vehicle.model.replace(/ Hybrid$/i, '').trim(),
      isHybrid ? `${vehicle.model} Hybrid` : vehicle.model,
      'ALL',
      ''
    ]));

    const originalTrim = context.trim || vehicle.trim;
    const possibleTrims = Array.from(new Set([
      vehicle.trim,
      originalTrim,
      vehicle.trim.replace(/ Hybrid$/i, '').trim(),
      originalTrim.replace(/ Hybrid$/i, '').trim(),
      vehicle.trim.split(' ')[0],
      originalTrim.split(' ')[0],
      'ALL',
      ''
    ]));

    let bankPrograms = await prisma.bankProgram.findMany({
      where: {
        batchId: activeBatch.id,
        programType: context.quoteType,
        make: { in: [vehicle.make, 'ALL', ''] },
        AND: [
          {
            OR: [
              { model: { in: possibleModels } },
              { model: { contains: vehicle.model, mode: 'insensitive' } }
            ]
          },
          {
            OR: [
              { trim: { in: possibleTrims } },
              { trim: { contains: vehicle.trim, mode: 'insensitive' } },
              { trim: { contains: originalTrim, mode: 'insensitive' } },
              { trim: { contains: vehicle.trim.split(' ')[0], mode: 'insensitive' } }
            ]
          }
        ],
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
    
    // Group programs by lender to pick the best match per lender
    const programsByLender = bankPrograms.reduce((acc, p) => {
      const lenderId = p.lenderId || 'CAPTIVE';
      if (!acc[lenderId]) acc[lenderId] = [];
      acc[lenderId].push(p);
      return acc;
    }, {} as Record<string, typeof bankPrograms>);

    let finalPrograms: typeof bankPrograms = [];

    for (const [lenderId, lenderPrograms] of Object.entries(programsByLender)) {
      let bestPrograms = lenderPrograms;

      // Filter to prioritize exact model match if multiple models are returned for this lender
      if (bestPrograms.length > 1) {
        const exactModelMatches = bestPrograms.filter(p => p.model?.toLowerCase() === vehicle.model.toLowerCase());
        if (exactModelMatches.length > 0) {
          bestPrograms = exactModelMatches;
        } else {
          const hybridStrippedModel = vehicle.model.replace(/ Hybrid$/i, '').trim();
          const strippedModelMatches = bestPrograms.filter(p => p.model?.toLowerCase() === hybridStrippedModel.toLowerCase());
          if (strippedModelMatches.length > 0) {
            bestPrograms = strippedModelMatches;
          }
        }
      }

      // Filter to prioritize exact trim match if multiple trims are returned for this lender
      if (bestPrograms.length > 1) {
        const exactMatches = bestPrograms.filter(p => p.trim?.toLowerCase() === vehicle.trim.toLowerCase() || p.trim?.toLowerCase() === originalTrim.toLowerCase());
        if (exactMatches.length > 0) {
          bestPrograms = exactMatches;
        } else {
          const hybridStripped = vehicle.trim.replace(/ Hybrid$/i, '').trim();
          const originalHybridStripped = originalTrim.replace(/ Hybrid$/i, '').trim();
          const strippedMatches = bestPrograms.filter(p => p.trim?.toLowerCase() === hybridStripped.toLowerCase() || p.trim?.toLowerCase() === originalHybridStripped.toLowerCase());
          if (strippedMatches.length > 0) {
            bestPrograms = strippedMatches;
          } else {
            // If no exact match, try to find the best partial match
            // Group by trim and pick the one that is most similar
            const trimGroups = bestPrograms.reduce((acc, p) => {
              const t = p.trim || '';
              if (!acc[t]) acc[t] = [];
              acc[t].push(p);
              return acc;
            }, {} as Record<string, typeof bankPrograms>);
            
            const trims = Object.keys(trimGroups);
            if (trims.length > 1) {
              // Simple heuristic: pick the shortest trim that contains our target words
              const targetWords = originalTrim.toLowerCase().split(/[\s-]+/);
              let bestTrim = trims[0];
              let maxMatches = 0;
              
              for (const t of trims) {
                const tLower = t.toLowerCase();
                const matches = targetWords.filter(w => tLower.includes(w)).length;
                if (matches > maxMatches) {
                  maxMatches = matches;
                  bestTrim = t;
                } else if (matches === maxMatches && t.length < bestTrim.length) {
                  bestTrim = t; // Prefer shorter strings if word match count is the same
                }
              }
              bestPrograms = trimGroups[bestTrim];
            }
          }
        }
      }
      
      finalPrograms.push(...bestPrograms);
    }
    
    bankPrograms = finalPrograms;

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
      dispositionFeeCents: (Number(settings.dispositionFee) || 395) * 100,
      routingStrategy: settings.routingStrategy || 'BEST_FOR_CUSTOMER'
    };
  }
  
  static async resolveDealerDiscount(context: QuoteContext, vehicle: any) {
    if (context.isStandalone && !context.marketcheckData) {
      return 0; // Standalone calculator uses MSRP without dealer discounts
    }

    if (context.marketcheckData?.priceCents && vehicle.msrpCents) {
      return vehicle.msrpCents - context.marketcheckData.priceCents;
    }

    if (context.adminOverrides?.dealerDiscountCents !== undefined) {
      return context.adminOverrides.dealerDiscountCents;
    }

    const now = new Date();
    const dealerAdjustment = await prisma.dealerAdjustment.findFirst({
      where: {
        isActive: true,
        startsAt: { lte: now },
        make: vehicle.make,
        AND: [
          { OR: [ { endsAt: null }, { endsAt: { gte: now } } ] },
          { OR: [ { model: vehicle.model }, { model: '' }, { model: null } ] },
          { OR: [ { trim: vehicle.trim }, { trim: '' }, { trim: null } ] }
        ]
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

    if (context.marketcheckData?.cashBackCents) {
      resolvedIncentives.totalRebateCents += context.marketcheckData.cashBackCents;
      // Assume marketcheck cashback is non-taxable for simplicity unless specified
      resolvedIncentives.nonTaxableRebateCents += context.marketcheckData.cashBackCents;
    }

    return resolvedIncentives;
  }
}
