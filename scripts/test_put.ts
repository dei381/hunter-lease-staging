import fetch from 'node-fetch';

async function testPut() {
  const res = await fetch('http://localhost:3000/api/cars', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      makes: [
        {
          id: 'test-make',
          name: 'Test Make',
          logoUrl: '',
          models: [
            {
              id: 'test-model',
              name: 'Test Model',
              class: 'Sedan',
              msrpRange: '$20k',
              years: [2024],
              imageUrl: '',
              mf: 0.001,
              rv36: 0.6,
              baseAPR: 4.9,
              leaseCash: 1000,
              trims: [
                {
                  name: 'Base',
                  msrp: 20000,
                  mf: 0.001,
                  apr: 4.9,
                  rv36: 0.6,
                  leaseCash: 1000
                }
              ]
            }
          ]
        }
      ]
    })
  });
  console.log(res.status, await res.text());
}

testPut();
