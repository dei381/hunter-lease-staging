import { PrismaClient } from '@prisma/client';
import { FinancialSyncService } from './server/services/FinancialSyncService';

const prisma = new PrismaClient();

async function runSync() {
  console.log("Starting manual Marketcheck sync for Toyota, BMW, and Kia...");
  
  const apiKey = process.env.MARKETCHECK_API_KEY;
  if (!apiKey) {
    console.error("MARKETCHECK_API_KEY is not set in the environment.");
    process.exit(1);
  }

  try {
    const record = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
    if (!record) {
      console.error("car_db not found in database.");
      process.exit(1);
    }

    let carDb = JSON.parse(record.data || '{}');
    
    // We only want to sync Toyota, BMW, and Kia.
    const targetMakes = ['Toyota', 'BMW', 'Kia'];
    
    for (const makeName of targetMakes) {
      console.log(`\n--- Syncing ${makeName} ---`);
      const result = await FinancialSyncService.syncFromExternalAPI(apiKey, carDb, makeName);
      carDb = result.updatedDb;
      
      console.log(`Stats for ${makeName}:`, result.stats);
      if (result.stats.quotaExhausted) {
        console.warn("Quota exhausted! Stopping early.");
        break;
      }
    }

    // Save back to DB
    await prisma.siteSettings.update({
      where: { id: 'car_db' },
      data: { data: JSON.stringify(carDb) }
    });

    console.log("\nSync completed and saved to database successfully.");
  } catch (error) {
    console.error("Error during sync:", error);
  } finally {
    await prisma.$disconnect();
  }
}

runSync();
