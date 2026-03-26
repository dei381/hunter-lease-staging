/**
 * FinancialSyncService
 * Handles reverse calculations for MF/APR and synchronizes with external car data APIs.
 */

import db from './../lib/db';

export class FinancialSyncService {
  /**
   * Reverse calculates Money Factor (MF) from lease parameters.
   */
  static solveForMF(payment: number, capCost: number, residual: number, term: number): number {
    const depreciation = (capCost - residual) / term;
    const rentCharge = payment - depreciation;
    const mf = rentCharge / (capCost + residual);
    return Math.max(0, parseFloat(mf.toFixed(5)));
  }

  /**
   * Reverse calculates APR from finance parameters using Newton-Raphson method.
   */
  static solveForAPR(payment: number, principal: number, term: number): number {
    if (payment * term <= principal) return 0;
    
    let r = 0.05 / 12; // Initial guess (5% APR)
    const precision = 0.000001;
    let iteration = 0;
    const maxIterations = 100;

    while (iteration < maxIterations) {
      const factor = Math.pow(1 + r, term);
      const f = (payment * (1 - 1 / factor)) / r - principal;
      const df = (payment * (1 - 1 / factor)) / (r * r) + (payment * term) / (r * factor * (1 + r));
      
      const nextR = r + f / df;
      if (Math.abs(nextR - r) < precision) {
        return Math.max(0, parseFloat((nextR * 12 * 100).toFixed(2)));
      }
      r = nextR;
      iteration++;
    }

    return parseFloat((r * 12 * 100).toFixed(2));
  }

  /**
   * Syncs with Marketcheck Universe API and writes to normalized tables (VehicleCache, BankProgram)
   */
  static async syncFromExternalAPI(rawApiKey: string, currentDb: any, targetMakesInput?: string | string[], targetModel?: string) {
    const apiKey = rawApiKey.trim();
    const targetMakes = typeof targetMakesInput === 'string' ? [targetMakesInput] : targetMakesInput;
    const targetMakesStr = targetMakes?.length ? targetMakes.join(', ') : '';
    console.log(`Starting Optimized Marketcheck API Sync... ${targetMakesStr ? `Target Makes: ${targetMakesStr}` : ''} ${targetModel ? `Target Model: ${targetModel}` : ''}`);
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    let requestCount = 0;
    let updatedModelsCount = 0;
    let updatedTrimsCount = 0;
    let errors: string[] = [];
    const report: any[] = [];
    let quotaExhausted = false;

    // Find active batch for programs
    let activeBatch = await db.programBatch.findFirst({ where: { status: 'ACTIVE' } });
    if (!activeBatch) {
      activeBatch = await db.programBatch.create({
        data: { status: 'ACTIVE', isValid: true }
      });
    }

    // Collect all existing models from currentDb (car_db) or fallback to VehicleCache
    let modelsToUpdate: { make: string, model: string, year: number }[] = [];
    
    if (currentDb && currentDb.makes && currentDb.makes.length > 0) {
      for (const make of currentDb.makes) {
        if (targetMakes && targetMakes.length > 0 && !targetMakes.some(m => m.toLowerCase() === make.name.toLowerCase())) continue;
        for (const model of make.models || []) {
          if (targetModel && model.name.toLowerCase() !== targetModel.toLowerCase()) continue;
          // Use 2026 as default year for new cars, or extract from trims if available
          let year = 2026;
          if (model.trims && model.trims.length > 0 && model.trims[0].year) {
            year = model.trims[0].year;
          }
          modelsToUpdate.push({ make: make.name, model: model.name, year });
        }
      }
    } else {
      const whereClause: any = {};
      if (targetMakes && targetMakes.length > 0) whereClause.make = { in: targetMakes };
      if (targetModel) whereClause.model = targetModel;

      const vehicles = await db.vehicleCache.findMany({
        where: whereClause,
        select: { make: true, model: true, year: true },
        distinct: ['make', 'model', 'year']
      });
      modelsToUpdate = vehicles;
    }

    if (!targetMakes?.length && !targetModel) {
      // If no specific target, just take first 50 to avoid rate limits
      modelsToUpdate = modelsToUpdate.slice(0, 50);
      console.log(`Selected ${modelsToUpdate.length} models to update.`);
    } else {
      console.log(`Selected ${modelsToUpdate.length} models matching target criteria.`);
    }

    for (const { make, model, year } of modelsToUpdate) {
      try {
        if (!targetMakes?.length && !targetModel && requestCount >= 50) {
          console.warn("Reached 50 requests limit for this sync run. Stopping to save quota.");
          break;
        } else if (requestCount >= 480) {
          console.warn("Approaching API quota limit (500). Stopping sync.");
          break;
        }

        if (requestCount > 0) await delay(300);
        
        const url = new URL('https://api.marketcheck.com/v2/search/car/active');
        url.searchParams.append('api_key', apiKey);
        url.searchParams.append('car_type', 'new');
        url.searchParams.append('make', make);
        url.searchParams.append('model', model);
        url.searchParams.append('year', year.toString());
        url.searchParams.append('zip', '90210');
        url.searchParams.append('radius', '100');
        url.searchParams.append('rows', '50');
        url.searchParams.append('facets', 'trim');
        
        const response = await fetch(url.toString(), {
          headers: {
            'Accept': 'application/json',
            'api_key': apiKey,
            'User-Agent': 'Mozilla/5.0'
          }
        });
        requestCount++;

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`API Error ${response.status} for ${make} ${model}: ${errorText}`);
          errors.push(`${make} ${model}: ${response.status} ${errorText.slice(0, 50)}`);
          if (response.status === 401) throw new Error("Invalid API Key");
          if (response.status === 429 && errorText.includes("quota exhausted")) {
            quotaExhausted = true;
            throw new Error("Marketcheck API monthly quota exhausted.");
          }
          continue;
        }

        const data = await response.json();
        console.log(`AutoSyncService: ${make} ${model} - Found ${data.listings?.length || 0} listings`);
        
        if (data.listings && data.listings.length > 0) {
          let modelUpdated = false;

          const foundTrims = new Map<string, { msrp: number, rebates: number, mf: number, apr: number, rv: number, term: number, mileage: number }>();

          data.listings.forEach((listing: any) => {
            const trimName = listing.build?.trim || 'Base';
            const msrp = listing.msrp || listing.price || 0;
            
            const rawRebates = listing.rebates || 
                           listing.extra?.rebates || 
                           listing.finance_details?.lease_details?.rebates || 
                           listing.finance_details?.finance_details?.rebates || 0;
            const rebates = parseFloat(rawRebates) || 0;

            let calculatedMF = 0;
            let calculatedAPR = 0;
            let residualValue = 0;
            let term = 36;
            let mileage = 10000;

            const lease = listing.finance_details?.lease_details;
            if (lease) {
              if (lease.money_factor !== undefined && lease.money_factor !== null) {
                calculatedMF = parseFloat(lease.money_factor);
              } else if (lease.monthly_payment && lease.term && lease.residual_value) {
                const payment = lease.monthly_payment;
                term = lease.term;
                const residual = lease.residual_value;
                const capCost = lease.net_cap_cost || (msrp - (lease.down_payment || 0));
                
                if (capCost > residual) {
                  calculatedMF = FinancialSyncService.solveForMF(payment, capCost, residual, term);
                }
              }
              if (lease.residual_value && msrp > 0) {
                residualValue = lease.residual_value / msrp;
              }
              if (lease.term) term = lease.term;
            }

            const finance = listing.finance_details?.finance_details;
            if (finance) {
              if (finance.apr !== undefined && finance.apr !== null) {
                calculatedAPR = parseFloat(finance.apr);
              } else if (finance.monthly_payment && finance.term && finance.loan_amount) {
                calculatedAPR = FinancialSyncService.solveForAPR(finance.monthly_payment, finance.loan_amount, finance.term);
              }
              if (!lease && finance.term) term = finance.term; // Use finance term if no lease
            }

            if (msrp > 0) {
              if (!foundTrims.has(trimName)) {
                foundTrims.set(trimName, { msrp, rebates, mf: calculatedMF, apr: calculatedAPR, rv: residualValue, term, mileage });
              } else {
                const existing = foundTrims.get(trimName)!;
                if (calculatedMF > 0 && existing.mf === 0) existing.mf = calculatedMF;
                if (calculatedAPR > 0 && existing.apr === 0) existing.apr = calculatedAPR;
                if (residualValue > 0 && existing.rv === 0) existing.rv = residualValue;
                if (rebates > existing.rebates) existing.rebates = rebates;
              }
            }
          });

          if (foundTrims.size > 0) {
            for (const [trimName, val] of Array.from(foundTrims.entries())) {
              // 1. Upsert VehicleCache
              const vehicle = await db.vehicleCache.findFirst({
                where: { make, model, year, trim: trimName }
              });

              if (vehicle) {
                await db.vehicleCache.update({
                  where: { id: vehicle.id },
                  data: { msrpCents: val.msrp * 100 }
                });
              } else {
                await db.vehicleCache.create({
                  data: {
                    make, model, year, trim: trimName,
                    msrpCents: val.msrp * 100,
                    features: '[]'
                  }
                });
              }

              // 2. Upsert BankProgram (Lease)
              if (val.mf > 0 || val.rv > 0) {
                const existingLease = await db.bankProgram.findFirst({
                  where: { batchId: activeBatch.id, programType: 'LEASE', make, model, year, trim: trimName, term: val.term }
                });
                if (existingLease) {
                  await db.bankProgram.update({
                    where: { id: existingLease.id },
                    data: { mf: val.mf || existingLease.mf, rv: val.rv || existingLease.rv, rebates: Math.round(val.rebates * 100) }
                  });
                } else {
                  await db.bankProgram.create({
                    data: {
                      batchId: activeBatch.id,
                      programType: 'LEASE',
                      make, model, year, trim: trimName,
                      term: val.term,
                      mileage: val.mileage,
                      mf: val.mf || 0.0025,
                      rv: val.rv || 0.60,
                      rebates: Math.round(val.rebates * 100)
                    }
                  });
                }
              }

              // 3. Upsert BankProgram (Finance)
              if (val.apr > 0) {
                const existingFinance = await db.bankProgram.findFirst({
                  where: { batchId: activeBatch.id, programType: 'FINANCE', make, model, year, trim: trimName, term: val.term }
                });
                if (existingFinance) {
                  await db.bankProgram.update({
                    where: { id: existingFinance.id },
                    data: { apr: val.apr, rebates: Math.round(val.rebates * 100) }
                  });
                } else {
                  await db.bankProgram.create({
                    data: {
                      batchId: activeBatch.id,
                      programType: 'FINANCE',
                      make, model, year, trim: trimName,
                      term: val.term,
                      apr: val.apr,
                      rebates: Math.round(val.rebates * 100)
                    }
                  });
                }
              }

              // 4. Update currentDb (carDb)
              if (currentDb && currentDb.makes) {
                const makeObj = currentDb.makes.find((m: any) => m.name.toLowerCase() === make.toLowerCase());
                if (makeObj && makeObj.models) {
                  const modelObj = makeObj.models.find((m: any) => m.name.toLowerCase() === model.toLowerCase());
                  if (modelObj && modelObj.trims) {
                    // Find exact trim, or try to do a partial match if API trim name differs slightly
                    let trimObj = modelObj.trims.find((t: any) => t.name.toLowerCase() === trimName.toLowerCase());
                    
                    if (!trimObj) {
                      // Try partial match
                      trimObj = modelObj.trims.find((t: any) => 
                        t.name.toLowerCase().includes(trimName.toLowerCase()) || 
                        trimName.toLowerCase().includes(t.name.toLowerCase())
                      );
                    }
                    
                    if (!trimObj && trimName === 'Base' && modelObj.trims.length > 0) {
                      trimObj = modelObj.trims[0]; // Apply to first trim if API just says "Base"
                    }
                    
                    if (trimObj) {
                      const oldMsrp = trimObj.msrp || 0;
                      const oldMf = trimObj.mf || 0;
                      const oldRv = trimObj.rv36 || 0;
                      const oldApr = trimObj.baseAPR || 0;

                      if (val.msrp > 0) trimObj.msrp = val.msrp;
                      if (val.mf > 0) trimObj.mf = Number(val.mf.toFixed(5));
                      if (val.rv > 0) trimObj.rv36 = Number(val.rv.toFixed(2));
                      if (val.apr > 0) trimObj.baseAPR = Number(val.apr.toFixed(2));
                      // We don't overwrite savings here, as requested by user
                      
                      // Note: We don't add rebates to availableIncentives here because 
                      // they are already applied directly to the BankProgram.
                      // Adding them here would cause double-counting in the calculator.
                      
                      report.push({
                        make: makeObj.name,
                        model: modelObj.name,
                        trim: trimObj.name,
                        changes: {
                          msrp: { old: oldMsrp, new: trimObj.msrp },
                          mf: { old: oldMf, new: trimObj.mf },
                          rv: { old: oldRv, new: trimObj.rv36 },
                          apr: { old: oldApr, new: trimObj.baseAPR },
                          rebates: { old: 0, new: val.rebates }
                        }
                      });
                    }
                  }
                }
              }

              updatedTrimsCount++;
              modelUpdated = true;
            }

            if (modelUpdated) {
              updatedModelsCount++;
            }
          }
        }

      } catch (error: any) {
        console.error(`Error syncing ${make} ${model}:`, error);
        if (error.message === "Invalid API Key") throw error;
        if (error.message.includes("quota exhausted")) quotaExhausted = true;
      }
      
      if (quotaExhausted) break;
    }

    console.log(`Optimized Sync Complete. Total API requests: ${requestCount}`);
    
    return {
      updatedDb: currentDb, // Return original to not break existing code that expects it
      stats: {
        requestCount,
        updatedModelsCount,
        updatedTrimsCount,
        quotaExhausted,
        errors: errors.slice(0, 10),
        report
      }
    };
  }
}
