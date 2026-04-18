import dotenv from 'dotenv';
import db from './server/lib/db';
import { MarketcheckSyncService } from './server/services/MarketcheckSyncService';
import { getCarDb, saveCarDb } from './server/utils/carDb';

dotenv.config({ override: true });

async function main() {
  const apiKey = (process.env.MARKETCHECK_API_KEY || process.env.API_KEY || '').trim();
  if (!apiKey) {
    throw new Error('MARKETCHECK_API_KEY is not configured');
  }

  const dryRun = process.argv.includes('--dry-run');
  const targetMakes = process.argv
    .filter((arg) => arg.startsWith('--make='))
    .map((arg) => arg.slice('--make='.length))
    .filter(Boolean);
  const targetModels = process.argv
    .filter((arg) => arg.startsWith('--model='))
    .map((arg) => arg.slice('--model='.length))
    .filter(Boolean);

  const carDb = await getCarDb();
  const diff = await MarketcheckSyncService.fetchDiff(
    apiKey,
    carDb,
    targetMakes.length > 0 ? targetMakes : undefined,
    targetModels.length > 0 ? targetModels : undefined
  );

  const photoChanges = diff.cars.filter((item: any) => item.changes?.photoLinks || item.changes?.modelImageUrl);

  console.log(JSON.stringify({
    dryRun,
    totalCars: diff.cars.length,
    photoChanges: photoChanges.length,
    sample: photoChanges.slice(0, 12).map((item: any) => ({
      make: item.make,
      model: item.model,
      trim: item.trim,
      modelImageUrl: item.changes?.modelImageUrl?.new || item.modelImageUrl || null,
      photoCount: item.changes?.photoLinks?.new?.length || item.photos?.length || 0,
    })),
  }, null, 2));

  if (dryRun) {
    await db.$disconnect();
    return;
  }

  const appliedCount = await MarketcheckSyncService.applyDiff(carDb, diff, db);
  await saveCarDb(carDb);

  console.log(JSON.stringify({ appliedCount }, null, 2));
  await db.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await db.$disconnect();
  process.exitCode = 1;
});