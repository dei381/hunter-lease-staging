import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const API_KEY = process.env.MARKETCHECK_API_KEY || '';
const DEALER_IDS = ['1050283', '11051583']; // Keyes and Hyundai of Glendale

async function fetchDealerInventory(dealerId, zip) {
  const allListings = [];
  try {
    const firstUrl = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${API_KEY}&zip=${zip}&radius=10&make=Hyundai&car_type=new&rows=50&start=0`;
    const firstRes = await fetch(firstUrl);
    if (!firstRes.ok) return [];
    const firstData = await firstRes.json();
    const numFound = firstData.num_found || 0;
    const totalPages = Math.ceil(numFound / 50);

    for (let i = 0; i < totalPages; i++) {
       console.log(`Fetching page ${i+1}/${totalPages} for zip ${zip}...`);
       const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${API_KEY}&zip=${zip}&radius=10&make=Hyundai&car_type=new&rows=50&start=${i * 50}`;
       const res = await fetch(url);
       if (!res.ok) {
         console.log(`Failed page ${i+1} for zip ${zip}: ${res.status}`);
         break;
       }
       const data = await res.json();
       if (!data.listings || data.listings.length === 0) {
         break;
       }
       for (const listing of data.listings) {
          if (listing.dealer && listing.dealer.id.toString() === dealerId.toString()) {
            allListings.push(listing);
          }
       }
    }
  } catch(e) {
    console.error(e);
  }
  return allListings;
}

async function run() {
  console.log('Deleting existing Hyundai marketcheck deal records...');
  const delRes = await prisma.dealRecord.deleteMany({
    where: { 
      OR: [
        { ingestionId: { startsWith: 'MC-' } },
        { payload: { contains: 'Hyundai' } }
      ]
    }
  });
  console.log(`Deleted ${delRes.count} old deals.`);

  const expireDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  let totalDealsAdded = 0;
  for (const did of DEALER_IDS) {
    let zip = '91401';
    if (did === '11051583') zip = '91204';
    const listings = await fetchDealerInventory(did, zip);
    console.log(`Dealer ${did} returned ${listings.length} cars`);
    
    for (const car of listings) {
       const make = car.build?.make || 'Hyundai';
       const model = car.build?.model || 'Unknown';
       const trim = car.build?.trim || 'Base';
       
       const fd = {
         type: "lease",
         make: make,
         model: model,
         trim: trim,
         msrp: car.msrp || car.price || 0,
         sellingPrice: car.price || car.msrp || 0,
         vin: car.vin,
         mileage: 12000,
         term: 36,
         dueAtSigning: 3000
       };
       
       await prisma.dealRecord.upsert({
         where: { ingestionId: `MC-${car.vin}` },
         create: {
           type: "v2",
           ingestionId: `MC-${car.vin}`,
           publishStatus: "PUBLISHED",
           reviewStatus: "APPROVED",
           financialData: JSON.stringify(fd),
           payload: JSON.stringify(car),
           seoTitle: `${make} ${model} Lease Offer`,
           customUrl: `deal-mc-${car.vin.toLowerCase()}`,
           expirationDate: expireDate
         },
         update: {
           financialData: JSON.stringify(fd),
           payload: JSON.stringify(car),
           expirationDate: expireDate
         }
       });
       totalDealsAdded++;
    }
  }
  console.log(`Done. Successfully added ${totalDealsAdded} deals to our table.`);
}

run()
  .then(() => process.exit(0))
  .catch(e => { console.error(e); process.exit(1); });
