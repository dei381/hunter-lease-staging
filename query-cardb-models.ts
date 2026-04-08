import { getCarDb } from './server/utils/carDb';

async function run() {
  const db = await getCarDb();
  const toyota = db.makes.find(m => m.name === 'Toyota');
  console.log(toyota?.models.map(m => m.name));
}

run();
