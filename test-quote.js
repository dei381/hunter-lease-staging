import fetch from 'node-fetch';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/v2/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        make: undefined,
        model: undefined,
        trim: undefined,
        type: undefined,
        term: undefined,
        mileage: undefined,
        downPayment: undefined,
        tier: undefined,
        zipCode: undefined
      })
    });
    const text = await res.text();
    console.log('Status:', res.status);
    console.log('Response:', text.substring(0, 200));
  } catch (err) {
    console.error('Error:', err);
  }
}

test();
