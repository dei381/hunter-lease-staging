import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/v2/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: '2b6abd47-5137-4caa-b742-c069f7404077',
        type: 'LEASE',
        term: 36,
        downPayment: 0,
        annualMileage: 10000,
        make: 'Toyota',
        model: 'Highlander',
        trim: 'LE Hybrid'
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}

run();
