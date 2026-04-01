import { PrismaClient } from '@prisma/client';
import { FinancialSyncService } from './server/services/FinancialSyncService';

const prisma = new PrismaClient();

const MAKES = [
  'Toyota', 'Lexus', 'BMW', 'Mercedes-Benz', 'Audi', 
  'Porsche', 'Kia', 'Hyundai', 'Genesis', 'Honda'
];

async function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(url: string, apiKey: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'api_key': apiKey,
          'User-Agent': 'AutoBandit-Sync/1.0'
        }
      });
      if (!response.ok) {
        if (response.status === 429) {
          console.warn('Rate limited, waiting 2 seconds...');
          await delay(2000);
          continue;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await delay(1000);
    }
  }
}

async function main() {
  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) {
    console.error("MARKETCHECK_API_KEY is not set.");
    process.exit(1);
  }

  console.log("Starting full sync for 10 makes...");
  
  const carDb: any = {
    lastUpdated: new Date().toISOString(),
    makes: []
  };

  let totalRequests = 0;

  for (const makeName of MAKES) {
    console.log(`\n--- Fetching models for ${makeName} ---`);
    
    // Fetch top models for 2026
    let year = '2026';
    let url = `https://api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=${makeName}&year=${year}&facets=model&rows=0`;
    let data = await fetchWithRetry(url, apiKey);
    totalRequests++;

    let modelsFacet = data.facets?.model || [];
    
    // If no 2026 models, fallback to 2025
    if (modelsFacet.length === 0) {
      console.log(`No 2026 models found for ${makeName}, falling back to 2025...`);
      year = '2025';
      url = `https://api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=${makeName}&year=${year}&facets=model&rows=0`;
      data = await fetchWithRetry(url, apiKey);
      totalRequests++;
      modelsFacet = data.facets?.model || [];
    }

    // Take top 8 models
    const topModels = modelsFacet.slice(0, 8).map((m: any) => m.item);
    console.log(`Found ${topModels.length} top models: ${topModels.join(', ')}`);

    const makeObj: any = {
      name: makeName,
      models: []
    };

    for (const modelName of topModels) {
      console.log(`  Fetching trims for ${makeName} ${modelName}...`);
      await delay(300); // Rate limit protection
      
      const listingsUrl = `https://api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&car_type=new&make=${makeName}&model=${modelName}&year=${year}&rows=50&facets=trim`;
      const listingsData = await fetchWithRetry(listingsUrl, apiKey);
      totalRequests++;

      const trimsMap = new Map<string, any>();
      let modelImageUrl = '';

      if (listingsData.listings && listingsData.listings.length > 0) {
        // Get model image from the first listing
        modelImageUrl = listingsData.listings[0].media?.photo_links?.[0] || '';

        listingsData.listings.forEach((listing: any) => {
          const trimName = listing.build?.trim || 'Base';
          const msrp = listing.msrp || listing.price || 0;
          
          if (msrp === 0) return;

          const rebates = listing.rebates || 
                         listing.extra?.rebates || 
                         listing.finance_details?.lease_details?.rebates || 0;

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
              residualValue = residual / msrp;
            }
          }

          const finance = listing.finance_details?.finance_details;
          if (finance && finance.monthly_payment && finance.term && finance.loan_amount) {
            calculatedAPR = FinancialSyncService.solveForAPR(finance.monthly_payment, finance.loan_amount, finance.term);
          }

          if (!trimsMap.has(trimName)) {
            trimsMap.set(trimName, { msrp, rebates, mf: calculatedMF, apr: calculatedAPR, rv: residualValue });
          } else {
            const existing = trimsMap.get(trimName);
            if (calculatedMF > 0 && existing.mf === 0) existing.mf = calculatedMF;
            if (calculatedAPR > 0 && existing.apr === 0) existing.apr = calculatedAPR;
            if (residualValue > 0 && existing.rv === 0) existing.rv = residualValue;
            if (rebates > existing.rebates) existing.rebates = rebates;
            // Keep the lowest MSRP for the trim
            if (msrp < existing.msrp) existing.msrp = msrp;
          }
        });
      }

      // If we didn't find any trims in listings, but facets has them, we could do 1 query per trim, but let's skip to save quota
      // Or just add them with 0 MSRP (which will be filtered out later)
      
      const trimsList = Array.from(trimsMap.entries()).map(([name, val]) => ({
        name,
        msrp: val.msrp,
        feat: `${val.mf > 0 ? 'Lease Ready' : 'Finance Ready'} · ${val.rv > 0 ? (val.rv * 100).toFixed(0) + '% RV' : 'New'}`,
        mf: val.mf || 0.0025,
        rv36: val.rv || 0.60,
        baseAPR: val.apr || 5.99,
        leaseCash: val.rebates,
        lastUpdated: new Date().toISOString(),
        isAutoAdded: true
      }));

      if (trimsList.length > 0) {
        makeObj.models.push({
          name: modelName,
          years: [parseInt(year)],
          imageUrl: modelImageUrl,
          trims: trimsList,
          lastUpdated: new Date().toISOString()
        });
        console.log(`    Added ${trimsList.length} trims for ${modelName}`);
      } else {
        console.log(`    No valid trims found for ${modelName}`);
      }
    }

    if (makeObj.models.length > 0) {
      carDb.makes.push(makeObj);
    }
  }

  console.log(`\nSync complete! Total API requests: ${totalRequests}`);
  
  // Save to DB
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(carDb) },
    create: { id: 'car_db', data: JSON.stringify(carDb) }
  });
  
  console.log("Saved to database successfully.");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
