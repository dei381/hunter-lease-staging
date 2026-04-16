import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?rows=50');
    const data = await res.json();
    const nullVins = data.listings.filter(l => l.vin == null);
    console.log('Null VINs count:', nullVins.length);
  } catch (err) {
    console.error(err);
  }
}
test();
