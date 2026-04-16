const fetch = require('node-fetch');
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/deals?limit=5');
    if (!res.ok) {
      console.log('Error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Deals count:', data.length);
  } catch (err) {
    console.error(err);
  }
}
test();
