import { PrismaClient } from '@prisma/client';
import { getCarDb } from './server/utils/carDb.js';

async function main() {
  const db = await getCarDb();
  const toyota = db.makes.find(m => m.id === 'toyota');
  if (toyota) {
    const sequoia = toyota.models.find(m => m.id === 'sequoia');
    console.log(JSON.stringify(sequoia, null, 2));
  }
}
main();
