const url = 'https://hunter-lease-staging.onrender.com/api/v2/quote';

const testPayloads = [
  {
    name: 'BMW 3 Series LEASE 36mo (with year number)',
    body: { make: 'BMW', model: '3 Series', trim: '330i', year: 2024, type: 'lease', term: 36, mileage: 10000, downPaymentCents: 300000, tradeInEquityCents: 0, tier: 't1', zipCode: '90210' }
  },
  {
    name: 'BMW 3 Series LEASE 36mo (year as string)',
    body: { make: 'BMW', model: '3 Series', trim: '330i', year: '2024', type: 'lease', term: 36, mileage: 10000, downPaymentCents: 300000, tradeInEquityCents: 0, tier: 't1', zipCode: '90210' }
  },
  {
    name: 'BMW 3 Series LEASE 36mo (no year)',
    body: { make: 'BMW', model: '3 Series', trim: '330i', type: 'lease', term: 36, mileage: 10000, downPaymentCents: 300000, tradeInEquityCents: 0, tier: 't1', zipCode: '90210' }
  },
  {
    name: 'BMW 3 Series LEASE 36mo (with vehicleId)',
    body: { vehicleId: 'd5a1accb-63f9-43e0-a6cd-7074e7e3c41c', make: 'BMW', model: '3 Series', trim: '330i', year: 2024, type: 'lease', term: 36, mileage: 10000, downPaymentCents: 300000, tradeInEquityCents: 0, tier: 't1', zipCode: '90210' }
  }
];

for (const test of testPayloads) {
  console.log(`\n=== ${test.name} ===`);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(test.body)
    });
    const data = await res.json();
    console.log(`Status: ${res.status}`);
    if (res.ok) {
      console.log(`Payment: ${data.monthlyPaymentCents} cents ($${(data.monthlyPaymentCents/100).toFixed(2)}/mo)`);
      console.log(`CalcStatus: ${data.calcStatus}`);
      if (data.warnings) console.log(`Warnings: ${data.warnings.join(', ')}`);
    } else {
      console.log(`Error: ${JSON.stringify(data).slice(0, 500)}`);
    }
  } catch (e: any) {
    console.log(`Fetch error: ${e.message}`);
  }
}
