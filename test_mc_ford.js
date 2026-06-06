import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?make=Ford&rows=50');
    const data = await res.json();
    console.log(`Found ${data.num_found} total, got ${data.listings?.length || 0} listings`);
    const trims = data.listings?.map(l => `${l.build?.make}-${l.build?.model}-${l.build?.trim}`) || [];
    console.log(new Set(trims));
  } catch (err) {
    console.error(err);
  }
}
test();
