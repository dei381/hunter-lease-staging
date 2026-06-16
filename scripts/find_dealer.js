import fetch from 'node-fetch';

const apiKey = process.env.MARKETCHECK_API_KEY || '';

async function findDealer(name, zip) {
  const url = `https://mc-api.marketcheck.com/v2/search/dealers/active?api_key=${apiKey}&zip=${zip}&radius=10`;
  const res = await fetch(url);
  if (!res.ok) {
    console.error('Failed', res.status);
    return;
  }
  const data = await res.json();
  const dealers = data.dealers || [];
  console.log(`Found ${dealers.length} dealers for ${zip}`);
  for (const d of dealers) {
    if (d.name.toLowerCase().includes(name.toLowerCase())) {
      console.log('Match!', d.id, d.name, d.street);
    }
  }
}

async function main() {
  await findDealer('Keyes', '91401');
  await findDealer('Hyundai of Glendale', '91204');
}

main();
