/**
 * FinancialSyncService
 * Handles reverse calculations for MF/APR and synchronizes with external car data APIs.
 */

export class FinancialSyncService {
  /**
   * Reverse calculates Money Factor (MF) from lease parameters.
   * Formula: Monthly Payment = (Cap Cost - Residual) / Term + (Cap Cost + Residual) * MF
   * Solving for MF: MF = (Monthly Payment - (Cap Cost - Residual) / Term) / (Cap Cost + Residual)
   */
  static solveForMF(payment: number, capCost: number, residual: number, term: number): number {
    const depreciation = (capCost - residual) / term;
    const rentCharge = payment - depreciation;
    const mf = rentCharge / (capCost + residual);
    return Math.max(0, parseFloat(mf.toFixed(5)));
  }

  /**
   * Reverse calculates APR from finance parameters using Newton-Raphson method.
   * Formula: P = [r*PV] / [1 - (1+r)^-n]
   */
  static solveForAPR(payment: number, principal: number, term: number): number {
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
   * Syncs with Marketcheck Universe API
   * Iterates through the database models, fetches data, and reverse-calculates MF/APR.
   * Includes a delay to prevent exceeding API rate limits (e.g., 500 requests).
   */
  static async syncFromExternalAPI(rawApiKey: string, currentDb: any, targetMake?: string, targetModel?: string) {
    const apiKey = rawApiKey.trim();
    console.log(`Starting Optimized Marketcheck API Sync... ${targetMake ? `Target Make: ${targetMake}` : ''} ${targetModel ? `Target Model: ${targetModel}` : ''}`);
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const updatedDb = JSON.parse(JSON.stringify(currentDb));
    let requestCount = 0;
    let updatedModelsCount = 0;
    let updatedTrimsCount = 0;
    let errors: string[] = [];
    let quotaExhausted = false;

    // Collect all existing models
    let allModels: { make: any, model: any }[] = [];
    for (const make of updatedDb.makes || []) {
      if (targetMake && make.name.toLowerCase() !== targetMake.toLowerCase()) continue;
      
      for (const model of make.models || []) {
        if (targetModel && model.name.toLowerCase() !== targetModel.toLowerCase()) continue;
        allModels.push({ make, model });
      }
    }

    let modelsToUpdate = allModels;

    if (!targetMake && !targetModel) {
      // If no specific target, sort by lastUpdated ascending (oldest first) and take 50
      allModels.sort((a, b) => {
        const dateA = new Date(a.model.lastUpdated || 0).getTime();
        const dateB = new Date(b.model.lastUpdated || 0).getTime();
        return dateA - dateB;
      });
      modelsToUpdate = allModels.slice(0, 50);
      console.log(`Selected ${modelsToUpdate.length} oldest models to update.`);
    } else {
      console.log(`Selected ${modelsToUpdate.length} models matching target criteria.`);
    }

    for (const { make, model } of modelsToUpdate) {
      try {
        // Respect rate limits and quota
        if (!targetMake && !targetModel && requestCount >= 50) {
          console.warn("Reached 50 requests limit for this sync run. Stopping to save quota.");
          break;
        } else if (requestCount >= 480) {
          console.warn("Approaching API quota limit (500). Stopping sync.");
          break;
        }

          if (requestCount > 0) await delay(300); // Small delay to be safe
          
          let year = '2026'; // Default to 2026 as requested
          if (Array.isArray(model.years) && model.years.length > 0) {
            // Prefer 2026, then 2025
            if (model.years.includes(2026) || model.years.includes('2026')) year = '2026';
            else if (model.years.includes(2025) || model.years.includes('2025')) year = '2025';
            else year = model.years[0].toString();
          } else if (typeof model.years === 'string') {
            if (model.years.includes('2026')) year = '2026';
            else if (model.years.includes('2025')) year = '2025';
            else year = model.years.split('-')[0];
          }
          
          const url = new URL('https://api.marketcheck.com/v2/search/car/active');
          url.searchParams.append('api_key', apiKey);
          url.searchParams.append('car_type', 'new');
          url.searchParams.append('make', make.name);
          url.searchParams.append('model', model.name);
          url.searchParams.append('year', year);
          url.searchParams.append('zip', '90210'); // Target California
          url.searchParams.append('radius', '100');
          url.searchParams.append('rows', '50'); // Get more listings to see all trims
          url.searchParams.append('facets', 'trim'); // Discover all trims via facets
          
          const response = await fetch(url.toString(), {
            headers: {
              'Accept': 'application/json',
              'api_key': apiKey,
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
          });
          requestCount++;

          if (!response.ok) {
            const errorText = await response.text();
            console.warn(`API Error ${response.status} for ${make.name} ${model.name}: ${errorText}`);
            errors.push(`${make.name} ${model.name}: ${response.status} ${errorText.slice(0, 50)}`);
            if (response.status === 401) throw new Error("Invalid API Key");
            if (response.status === 429 && errorText.includes("quota exhausted")) {
              quotaExhausted = true;
              throw new Error("Marketcheck API monthly quota exhausted.");
            }
            continue;
          }

          const data = await response.json();
          console.log(`AutoSyncService: ${make.name} ${model.name} - Found ${data.listings?.length || 0} listings and ${data.facets?.trim?.length || 0} trims in facets`);
          
          if (data.listings && data.listings.length > 0) {
            let modelUpdated = false;

            // Update model image if it's a default or missing
            if (data.listings[0].media?.photo_links?.[0] && 
                ((model.imageUrl && model.imageUrl.includes('unsplash.com')) || model.isAutoAdded || !model.imageUrl)) {
              model.imageUrl = data.listings[0].media.photo_links[0];
            }

            // Map to store trim data found in listings
            const foundTrims = new Map<string, { msrp: number, rebates: number, mf: number, apr: number, rv: number }>();

            // First, add all trims from facets to ensure we don't miss any
            if (data.facets?.trim) {
              data.facets.trim.forEach((t: any) => {
                if (t.item && !foundTrims.has(t.item)) {
                  foundTrims.set(t.item, { msrp: 0, rebates: 0, mf: 0, apr: 0, rv: 0 });
                }
              });
            }

            data.listings.forEach((listing: any) => {
              const trimName = listing.build?.trim || 'Base';
              const msrp = listing.msrp || listing.price || 0;
              
              // Extract rebates from various possible locations
              const rebates = listing.rebates || 
                             listing.extra?.rebates || 
                             listing.finance_details?.lease_details?.rebates || 
                             listing.finance_details?.finance_details?.rebates || 0;

              // Extract finance/lease details for MF/APR calculation
              let calculatedMF = 0;
              let calculatedAPR = 0;
              let residualValue = 0;

              const lease = listing.finance_details?.lease_details;
              if (lease && lease.monthly_payment && lease.term && lease.residual_value) {
                const payment = lease.monthly_payment;
                const term = lease.term;
                const residual = lease.residual_value;
                const capCost = lease.net_cap_cost || (msrp - (lease.down_payment || 0));
                
                if (capCost > residual) {
                  calculatedMF = FinancialSyncService.solveForMF(payment, capCost, residual, term);
                  residualValue = residual / msrp; // Store as percentage (0.60)
                }
              }

              const finance = listing.finance_details?.finance_details;
              if (finance && finance.monthly_payment && finance.term && finance.loan_amount) {
                calculatedAPR = FinancialSyncService.solveForAPR(finance.monthly_payment, finance.loan_amount, finance.term);
              }

              if (msrp > 0) {
                if (!foundTrims.has(trimName)) {
                  foundTrims.set(trimName, { 
                    msrp, 
                    rebates, 
                    mf: calculatedMF, 
                    apr: calculatedAPR, 
                    rv: residualValue 
                  });
                } else {
                  // If we already have this trim, maybe update with better data (e.g. if we found MF)
                  const existing = foundTrims.get(trimName)!;
                  if (calculatedMF > 0 && existing.mf === 0) existing.mf = calculatedMF;
                  if (calculatedAPR > 0 && existing.apr === 0) existing.apr = calculatedAPR;
                  if (residualValue > 0 && existing.rv === 0) existing.rv = residualValue;
                  if (rebates > existing.rebates) existing.rebates = rebates;
                }
              }
            });

            // Update existing trims or add new ones
            if (foundTrims.size > 0) {
              if (!model.trims) model.trims = [];

              foundTrims.forEach((val, name) => {
                // Fuzzy matching for trims - be more specific
                const existingTrim = model.trims.find((t: any) => 
                  t.name.toLowerCase() === name.toLowerCase() ||
                  // Only match if one is a subset and they are very similar length
                  ((t.name.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(t.name.toLowerCase())) && 
                   Math.abs(t.name.length - name.length) < 3)
                );

                if (existingTrim) {
                  const oldLeaseCash = existingTrim.leaseCash || 0;
                  existingTrim.msrp = val.msrp;
                  existingTrim.leaseCash = val.rebates;
                  if (val.mf > 0) existingTrim.mf = val.mf;
                  if (val.rv > 0) existingTrim.rv36 = val.rv;
                  if (val.apr > 0) existingTrim.baseAPR = val.apr;
                  
                  // Update tiersData if it exists to ensure the new leaseCash is visible
                  if (existingTrim.tiersData) {
                    Object.keys(existingTrim.tiersData).forEach(tierId => {
                      // If the tier's leaseCash was 0 or matched the old base, update it
                      if (!existingTrim.tiersData[tierId].leaseCash || existingTrim.tiersData[tierId].leaseCash === oldLeaseCash) {
                        existingTrim.tiersData[tierId].leaseCash = val.rebates;
                      }
                    });
                  }

                  existingTrim.lastUpdated = new Date().toISOString();
                  updatedTrimsCount++;
                  modelUpdated = true;
                } else {
                  // Add new trim
                  const newTrim = {
                    name: name,
                    msrp: val.msrp,
                    feat: `${val.mf > 0 ? 'Lease Ready' : 'Finance Ready'} · ${val.rv > 0 ? (val.rv * 100).toFixed(0) + '% RV' : 'New'}`,
                    mf: val.mf || model.mf || 0.0025,
                    rv36: val.rv || model.rv36 || 0.60,
                    baseAPR: val.apr || model.baseAPR || 5.99,
                    leaseCash: val.rebates,
                    lastUpdated: new Date().toISOString(),
                    isAutoAdded: true
                  };
                  model.trims.push(newTrim);
                  updatedTrimsCount++;
                  modelUpdated = true;
                  console.log(`AutoSyncService: Added new trim "${name}" to ${make.name} ${model.name}`);
                }
              });

              if (modelUpdated) {
                updatedModelsCount++;
                model.lastUpdated = new Date().toISOString();
              }

              // Also update model-level defaults if applicable
              const firstTrim = Array.from(foundTrims.values())[0];
              if (firstTrim) {
                model.leaseCash = firstTrim.rebates;
                if (firstTrim.mf > 0) model.mf = firstTrim.mf;
                if (firstTrim.rv > 0) model.rv36 = firstTrim.rv;
                if (firstTrim.apr > 0) model.baseAPR = firstTrim.apr;

                const msrps = Array.from(foundTrims.values()).map(v => v.msrp).filter(m => m > 0);
                if (msrps.length > 0) {
                  const min = Math.min(...msrps);
                  const max = Math.max(...msrps);
                  model.msrpRange = min === max ? `$${(min/1000).toFixed(0)}k` : `$${(min/1000).toFixed(0)}k - $${(max/1000).toFixed(0)}k`;
                }
              }
            }
          }

        } catch (error: any) {
          console.error(`Error syncing ${make.name} ${model.name}:`, error);
          if (error.message === "Invalid API Key") throw error;
          if (error.message.includes("quota exhausted")) quotaExhausted = true;
        }
        
        if (quotaExhausted) break;
    }

    if (!targetMake && !targetModel) {
      updatedDb.lastGlobalSync = new Date().toISOString();
    }
    console.log(`Optimized Sync Complete. Total API requests: ${requestCount}`);
    
    return {
      updatedDb,
      stats: {
        requestCount,
        updatedModelsCount,
        updatedTrimsCount,
        quotaExhausted,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    };
  }
}
