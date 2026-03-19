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
  static async syncFromExternalAPI(rawApiKey: string, currentDb: any) {
    const apiKey = rawApiKey.trim();
    console.log("Starting Optimized Marketcheck API Sync...");
    
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    const updatedDb = JSON.parse(JSON.stringify(currentDb));
    let requestCount = 0;
    let updatedModelsCount = 0;
    let updatedTrimsCount = 0;
    let errors: string[] = [];

    // We have 9 brands. Let's process them efficiently.
    for (const make of updatedDb.makes) {
      console.log(`--- Syncing Brand: ${make.name} ---`);
      
      for (const model of make.models) {
        try {
          // Respect rate limits and quota (500 requests total)
          if (requestCount >= 480) {
            console.warn("Approaching API quota limit (500). Stopping sync.");
            break;
          }

          if (requestCount > 0) await delay(300); // Small delay to be safe
          
          let year = new Date().getFullYear().toString();
          if (Array.isArray(model.years) && model.years.length > 0) {
            year = model.years[0].toString();
          } else if (typeof model.years === 'string') {
            year = model.years.split('-')[0];
          }
          
          const url = new URL('https://api.marketcheck.com/v2/search/car/active');
          url.searchParams.append('api_key', apiKey);
          url.searchParams.append('car_type', 'new');
          url.searchParams.append('make', make.name);
          url.searchParams.append('model', model.name);
          url.searchParams.append('year', year);
          url.searchParams.append('rows', '20'); // Get enough listings to see different trims
          
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
            continue;
          }

          const data = await response.json();
          
          if (data.listings && data.listings.length > 0) {
            let modelUpdated = false;
            // Map to store trim data found in listings
            const foundTrims = new Map<string, { msrp: number, rebates: number, mf: number, apr: number, rv: number }>();

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
                // Fuzzy matching for trims
                const existingTrim = model.trims.find((t: any) => 
                  t.name.toLowerCase() === name.toLowerCase() ||
                  t.name.toLowerCase().includes(name.toLowerCase()) ||
                  name.toLowerCase().includes(t.name.toLowerCase())
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
        }
      }
      if (requestCount >= 480) break;
    }

    updatedDb.lastGlobalSync = new Date().toISOString();
    console.log(`Optimized Sync Complete. Total API requests: ${requestCount}`);
    
    return {
      updatedDb,
      stats: {
        requestCount,
        updatedModelsCount,
        updatedTrimsCount,
        errors: errors.slice(0, 10) // Return first 10 errors
      }
    };
  }
}
