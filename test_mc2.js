import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?rows=5');
    const data = await res.json();
    console.log(data.listings.map(l => l.vin));
  } catch (err) {
    console.error(err);
  }
}
test();
