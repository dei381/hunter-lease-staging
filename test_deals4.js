import fetch from 'node-fetch';
async function test() {
  try {
    const params = new URLSearchParams({
      zipCode: '90210',
      isFirstTimeBuyer: 'false',
      tier: 't1',
      term: '36',
      down: '3000',
      mileage: '10k',
      displayMode: 'lease',
      limit: '50'
    });
    const res = await fetch(`http://localhost:3000/api/deals?${params.toString()}`);
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
