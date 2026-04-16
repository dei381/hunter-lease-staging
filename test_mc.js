import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/marketcheck/search?rows=5');
    if (!res.ok) {
      console.log('Error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Listings count:', data.listings ? data.listings.length : 0);
    console.log('Total count:', data.num_found);
  } catch (err) {
    console.error(err);
  }
}
test();
