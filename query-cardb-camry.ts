import { getCarDb } from './server/utils/carDb';

async function run() {
  const db = await getCarDb();
  const toyota = db.makes.find(m => m.name === 'Toyota');
  const camry = toyota?.models.find(m => m.name === 'Camry');
  console.log(camry?.trims.map(t => t.name));
}

run();
