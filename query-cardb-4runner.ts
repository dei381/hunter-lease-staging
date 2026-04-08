import { getCarDb } from './server/utils/carDb';

async function run() {
  const db = await getCarDb();
  const toyota = db.makes.find(m => m.name === 'Toyota');
  const runner = toyota?.models.find(m => m.name === '4Runner');
  console.log(runner?.trims.map(t => t.name));
}

run();
