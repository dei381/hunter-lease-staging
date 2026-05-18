import fetch from 'node-fetch';

async function main() {
  const url = `http://localhost:3000/api/marketcheck/search?rows=1`;
  const response = await fetch(url);
  const data = await response.json();
  const listing = data.listings[0];
  
  if (!listing) return;
  const vin = listing.vin;
  const res2 = await fetch(`http://localhost:3000/api/marketcheck/listing/${vin}`);
  const listing2 = await res2.json();
  console.log("VDP:", listing2.vdp_url);
  console.log("Dealer Website:", listing2.dealer?.website);
}

main().catch(console.error);
