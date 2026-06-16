import fetch from 'node-fetch';

const apiKey = process.env.MARKETCHECK_API_KEY || '';

async function searchCarsForDealer(zip) {
  const url = `https://mc-api.marketcheck.com/v2/search/car/active?api_key=${apiKey}&zip=${zip}&radius=5&make=Hyundai&car_type=new`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed', res.status, await res.text());
    return;
  }
  const data = await res.json();
  const listings = data.listings || [];
  console.log(`Found ${listings.length} listings near ${zip}`);
  const dealers = new Set();
  for (const listing of listings) {
    const d = listing.dealer;
    if (d) {
      if (!dealers.has(d.id)) {
        dealers.add(d.id);
        console.log('Dealer:', d.id, d.name, d.street);
      }
    }
  }
}

async function main() {
  console.log('--- 91401 Keyes ---');
  await searchCarsForDealer('91401');
  console.log('--- 91204 Glendale ---');
  await searchCarsForDealer('91204');
}

main();
