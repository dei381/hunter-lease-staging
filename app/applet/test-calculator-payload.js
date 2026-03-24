import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/v2/quote', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vehicleId: "camry-2025",
        lenderId: "tfs",
        config: {
          type: "lease",
          term: 36,
          downPayment: 3000,
          annualMileage: 7000,
          creditTier: "tier1",
          zipCode: "90210",
          msdCount: 0,
          selectedIncentiveIds: [],
          make: "Toyota",
          model: "Corolla",
          trim: "LE Sedan"
        }
      })
    });
    console.log(res.status);
    console.log(await res.text());
  } catch (e) {
    console.error(e);
  }
}
run();
