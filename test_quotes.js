import fetch from 'node-fetch';
async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/v2/quotes?zipCode=90210&uxTier=TIER_1_PLUS&isFirstTimeBuyer=false');
    if (!res.ok) {
      console.log('Error:', res.status, await res.text());
      return;
    }
    const data = await res.json();
    console.log('Quotes count:', data.length);
  } catch (err) {
    console.error(err);
  }
}
test();
