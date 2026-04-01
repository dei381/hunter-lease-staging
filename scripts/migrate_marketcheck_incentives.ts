import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  console.log('Fetching car_db from SiteSettings...');
  const settings = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  if (!settings || !settings.data) {
    console.error('car_db not found');
    return;
  }

  const carDb = JSON.parse(settings.data);
  let count = 0;

  for (const makeObj of carDb.makes || []) {
    for (const modelObj of makeObj.models || []) {
      for (const trimObj of modelObj.trims || []) {
        if (trimObj.leaseCash && trimObj.leaseCash > 0) {
          const amountCents = Math.round(trimObj.leaseCash * 100);
          const seedKey = `MC_${makeObj.name}_${modelObj.name}_${trimObj.name}`.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
          
          await prisma.oemIncentiveProgram.upsert({
            where: { seedKey },
            update: {
              amountCents,
              isActive: true,
              name: `Marketcheck Lease Cash`,
            },
            create: {
              seedKey,
              name: `Marketcheck Lease Cash`,
              amountCents,
              type: 'OEM_CASH',
              dealApplicability: 'LEASE',
              isTaxableCa: true,
              make: makeObj.name,
              model: modelObj.name,
              trim: trimObj.name,
              stackable: true,
              verifiedByAdmin: false,
              isActive: true,
            }
          });
          count++;
          console.log(`Migrated: ${makeObj.name} ${modelObj.name} ${trimObj.name} - $${trimObj.leaseCash}`);
        }
      }
    }
  }

  console.log(`Successfully migrated ${count} incentives from Marketcheck data.`);
}

run()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
