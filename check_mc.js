import fetch from 'node-fetch';

async function main() {
  const API_KEY = process.env.MARKETCHECK_API_KEY || 'QsIlNulfKENHhmsgWT8KfqGxCfVYPaSE';
  const url = `https://api.marketcheck.com/v2/search/car/active?api_key=${API_KEY}&rows=1`;
  const response = await fetch(url);
  const data = await response.json();
  const listing = data.listings[0];
  console.log("Dealer:", Object.keys(listing.dealer || {}));
  console.log("Dealer Website:", listing.dealer?.website);
  console.log("VDP URL:", listing.vdp_url);
  console.log("Build:", Object.keys(listing.build || {}));
}

main().catch(console.error);
