import fetch from 'node-fetch';

async function run() {
  try {
    const res = await fetch('http://localhost:3000/api/cars');
    const data = await res.json();
    const make = data.makes.find(m => m.name === 'Toyota');
    const model = make.models.find(m => m.name === 'Camry');
    console.log(model.trims.map(t => t.name));
  } catch (e) {
    console.error(e);
  }
}

run();
