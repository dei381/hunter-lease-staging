
import { AutoSyncService } from './server/services/AutoSyncService';
import prisma from './server/lib/db';

async function main() {
  console.log('--- Testing Discovery and Sync ---');
  
  // 1. Check current state
  const recordBefore = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  const carDbBefore = recordBefore ? JSON.parse(recordBefore.data || '{}') : { makes: [] };
  const totalTrimsBefore = carDbBefore.makes.reduce((acc: number, make: any) => 
    acc + make.models.reduce((mAcc: number, model: any) => mAcc + (model.trims?.length || 0), 0), 0
  );
  const totalModelsBefore = carDbBefore.makes.reduce((acc: number, make: any) => acc + make.models.length, 0);
  const totalMakesBefore = carDbBefore.makes.length;

  console.log(`Before Sync: Makes=${totalMakesBefore}, Models=${totalModelsBefore}, Trims=${totalTrimsBefore}`);

  // 2. Force a sync
  // We need to set lastGlobalSync to a long time ago
  if (recordBefore) {
    const data = JSON.parse(recordBefore.data || '{}');
    data.lastGlobalSync = '2000-01-01T00:00:00.000Z';
    await prisma.siteSettings.update({
      where: { id: 'car_db' },
      data: { data: JSON.stringify(data) }
    });
  }

  console.log('Starting sync...');
  await AutoSyncService.checkAndSync();
  console.log('Sync finished.');

  // 3. Check state after sync
  const recordAfter = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  const carDbAfter = recordAfter ? JSON.parse(recordAfter.data || '{}') : { makes: [] };
  const totalTrimsAfter = carDbAfter.makes.reduce((acc: number, make: any) => 
    acc + make.models.reduce((mAcc: number, model: any) => mAcc + (model.trims?.length || 0), 0), 0
  );
  const totalModelsAfter = carDbAfter.makes.reduce((acc: number, make: any) => acc + make.models.length, 0);
  const totalMakesAfter = carDbAfter.makes.length;

  console.log(`After Sync: Makes=${totalMakesAfter}, Models=${totalModelsAfter}, Trims=${totalTrimsAfter}`);
  
  if (totalTrimsAfter > totalTrimsBefore) {
    console.log(`SUCCESS: Discovered ${totalTrimsAfter - totalTrimsBefore} new trims!`);
  } else {
    console.log('No new trims discovered.');
  }

  if (totalModelsAfter > totalModelsBefore) {
    console.log(`SUCCESS: Discovered ${totalModelsAfter - totalModelsBefore} new models!`);
  }

  if (totalMakesAfter > totalMakesBefore) {
    console.log(`SUCCESS: Discovered ${totalMakesAfter - totalMakesBefore} new brands!`);
  }
}

main().catch(console.error);
