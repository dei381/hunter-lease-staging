import admin from 'firebase-admin';

const API_KEY = process.env.MARKETCHECK_API_KEY || 'QsIlNulfKENHhmsgWT8KfqGxCfVYPaSE';

export class MarketcheckInventoryService {
  static async syncInventory() {
    console.log('Starting Marketcheck inventory sync (LA Area)...');
    try {
      // LA Coordinates: 34.0522, -118.2437. Radius: 100 miles.
      const res = await fetch(
        `https://api.marketcheck.com/v2/search/car/active?api_key=${API_KEY}&latitude=34.0522&longitude=-118.2437&radius=100&car_type=new&rows=50&start=0`
      );
      
      if (!res.ok) {
        throw new Error(`Marketcheck API error: ${res.status} ${await res.text()}`);
      }

      const data: any = await res.json();
      const listings = data.listings || [];
      console.log(`Fetched ${listings.length} listings from Marketcheck`);

      const db = admin.firestore();
      
      // Process in chunks to avoid hitting rate limits too hard and Firestore batch limits
      for (const listing of listings) {
        const processed = await this.processListing(listing);
        await db.collection('mc_inventory').doc(listing.id).set({
          ...processed,
          source: 'marketcheck',
          updated_at: admin.firestore.FieldValue.serverTimestamp()
        });
      }

      console.log('Marketcheck inventory sync completed successfully');
      return { success: true, count: listings.length };
    } catch (error) {
      console.error('Error in Marketcheck inventory sync:', error);
      throw error;
    }
  }

  static async processListing(listing: any) {
    let msrp = listing.msrp;

    // If MSRP is missing, try to get it from the detail API
    if (!msrp || msrp === 0) {
      try {
        // Small delay to avoid aggressive rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
        const detailRes = await fetch(
          `https://api.marketcheck.com/v2/listing/car/${listing.id}?api_key=${API_KEY}`
        );
        if (detailRes.ok) {
          const data: any = await detailRes.json();
          msrp = data.msrp;
        }
      } catch (e) {
        console.error(`Error fetching detail for listing ${listing.id}:`, e);
      }
    }

    // If still no MSRP, mark as pending_review
    const status = (!msrp || msrp === 0)
      ? 'pending_review'
      : 'active';

    return { ...listing, msrp, status };
  }

  static async syncIncentives(make: string, year: number, zip: string = '90210') {
    console.log(`Syncing incentives for ${make} ${year} in ${zip}...`);
    try {
      const oem = make.toLowerCase();
      const res = await fetch(
        `https://api.marketcheck.com/v2/search/car/incentive/${oem}/${zip}?api_key=${API_KEY}`
      );

      if (!res.ok) {
        console.warn(`Marketcheck Incentives API error for ${oem}: ${res.status}`);
        return null;
      }

      const data: any = await res.json();
      const incentives = data.incentives || [];

      const db = admin.firestore();
      // Use a consistent key: make_zip (since incentives are regional)
      const docId = `${make.toLowerCase()}_${zip}`;
      await db.collection('mc_incentives').doc(docId).set({
        incentives,
        make,
        zip,
        updated_at: admin.firestore.FieldValue.serverTimestamp()
      });

      return incentives;
    } catch (error) {
      console.error('Error in Marketcheck incentives sync:', error);
      return null;
    }
  }
}
