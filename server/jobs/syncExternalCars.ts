import { JobQueue, Job } from '../services/JobQueue';
import { MarketcheckSyncService } from '../services/MarketcheckSyncService';
import { getCarDb, saveCarDb } from '../utils/carDb';
import { AuditLogger } from '../services/AuditLogger';
import NodeCache from 'node-cache';
import { PrismaClient } from '@prisma/client';
import fetch from 'node-fetch';

const prisma = new PrismaClient();
const DEALER_IDS = ['1050283', '11051583']; // Keyes and Hyundai of Glendale

// Key lives in SiteSettings 'integration_keys' (admin-editable, no redeploy) with env
// as fallback — same pattern as the Stripe keys.
async function getMarketcheckKey(): Promise<string> {
  try {
    const rec = await prisma.siteSettings.findUnique({ where: { id: 'integration_keys' } });
    const data = rec?.data ? JSON.parse(rec.data) : {};
    if (data.marketcheckApiKey) return data.marketcheckApiKey;
  } catch (e) {
    console.warn('getMarketcheckKey: falling back to env', e);
  }
  return process.env.MARKETCHECK_API_KEY || '';
}

async function fetchDealerInventoryFull(dealerId: string, zip: string) {
  const allListings: any[] = [];
  try {
    const apiKey = await getMarketcheckKey();
    if (!apiKey) {
      console.warn('Marketcheck sync skipped: no API key (settings or env)');
      return allListings;
    }
    const maxPages = 7; // 7 pages per dealer = 14 requests total, under 15/day limit

    for (let i = 0; i < maxPages; i++) {
       const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&zip=${zip}&radius=10&make=Hyundai&car_type=new&rows=50&start=${i * 50}&photo_links=true`;
       const res = await fetch(url);
       if (!res.ok) {
         break;
       }
       const data: any = await res.json();
       if (!data.listings || data.listings.length === 0) {
         break;
       }
       for (const listing of data.listings) {
          if (listing.dealer && listing.dealer.id.toString() === dealerId.toString()) {
            allListings.push(listing);
          }
       }
       // Avoid rate limits
       await new Promise(r => setTimeout(r, 300));
    }
  } catch(e) {
    console.error(e);
  }
  return allListings;
}

export async function syncDealersInventory() {
  console.log('Starting Marketcheck inventory caching job...');
  const expireDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days cache

  for (const did of DEALER_IDS) {
    let zip = '91401';
    if (did === '11051583') zip = '91204';
    
    const listings = await fetchDealerInventoryFull(did, zip);
    console.log(`Dealer ${did} returned ${listings.length} cars`);
    
    let totalAdded = 0;
    for (const car of listings) {
       const make = car.build?.make || 'Unknown';
       const model = car.build?.model || 'Unknown';
       const trim = car.build?.trim || 'Base';
       
       let image = null;
       const images = [];
       if (car.media?.photo_links?.length > 0) {
         image = car.media.photo_links[0];
         images.push(...car.media.photo_links);
       } else if (Array.isArray(car.media) && car.media[0]) {
         image = typeof car.media[0] === 'string' ? car.media[0] : car.media[0].url || null;
         car.media.forEach((m: any) => {
            if (typeof m === 'string') images.push(m);
            else if (m && m.url) images.push(m.url);
         });
       }

       const fd = {
         type: "lease",
         make: make,
         model: model,
         trim: trim,
         year: car.build?.year || new Date().getFullYear(),
         msrp: car.msrp || car.price || 0,
         sellingPrice: car.price || car.msrp || 0,
         vin: car.vin,
         mileage: 12000,
         term: 36,
         dueAtSigning: 3000,
         image: image,
         images: images,
         // Real per-VIN attributes from the dealer listing (the catalog shows these)
         exteriorColor: car.exterior_color || car.base_ext_color || '',
         interiorColor: car.interior_color || car.base_int_color || '',
         fuelType: car.fuel_type || car.build?.fuel_type || '',
         bodyStyle: car.body_style || car.build?.body_type || '',
         driveType: car.build?.drivetrain || '',
         seats: car.build?.doors === 4 ? 5 : 4
       };
       
       try {
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
             customUrl: `deal-mc-${car.vin ? car.vin.toLowerCase() : Date.now()}`,
             expirationDate: expireDate
           },
           update: {
             financialData: JSON.stringify(fd),
             payload: JSON.stringify(car),
             expirationDate: expireDate,
             publishStatus: "PUBLISHED",
             reviewStatus: "APPROVED"
           }
         });
         totalAdded++;
       } catch(e) {
         console.error(`Failed to upsert car ${car.vin}`, e);
       }
    }
    console.log(`Synced ${totalAdded} cars for dealer ${did}`);
  }
  console.log('Finished Marketcheck inventory caching job.');
}

// We need to pass the cache instance here or just clear it via a global event, 
// but for simplicity, we'll just re-import or handle it in server.ts where we register the job.
