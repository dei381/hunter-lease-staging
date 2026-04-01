import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting car database migration...');

  // Fetch the existing car_db from SiteSettings
  const carDbSetting = await prisma.siteSettings.findUnique({
    where: { id: 'car_db' }
  });

  if (!carDbSetting || !carDbSetting.data) {
    console.log('No car_db found in SiteSettings. Exiting.');
    return;
  }

  const carDb = JSON.parse(carDbSetting.data);

  if (!carDb.makes || !Array.isArray(carDb.makes)) {
    console.log('Invalid car_db structure. Exiting.');
    return;
  }

  let makesCreated = 0;
  let modelsCreated = 0;
  let trimsCreated = 0;

  for (const makeData of carDb.makes) {
    if (!makeData.name) continue;

    // Create or find Make
    const make = await prisma.vehicleMake.upsert({
      where: { name: makeData.name },
      update: {},
      create: { name: makeData.name }
    });
    makesCreated++;

    if (makeData.models && Array.isArray(makeData.models)) {
      for (const modelData of makeData.models) {
        if (!modelData.name) continue;

        // Create or find Model
        const model = await prisma.vehicleModel.upsert({
          where: {
            makeId_name: {
              makeId: make.id,
              name: modelData.name
            }
          },
          update: {
            years: modelData.years || [],
            imageUrl: modelData.imageUrl || null
          },
          create: {
            makeId: make.id,
            name: modelData.name,
            years: modelData.years || [],
            imageUrl: modelData.imageUrl || null
          }
        });
        modelsCreated++;

        if (modelData.trims && Array.isArray(modelData.trims)) {
          for (const trimData of modelData.trims) {
            if (!trimData.name) continue;

            const msrpCents = Math.round(Number(trimData.msrp || 0) * 100);
            const leaseCashCents = Math.round(Number(trimData.leaseCash || 0) * 100);

            // Create or find Trim
            await prisma.vehicleTrim.upsert({
              where: {
                modelId_name: {
                  modelId: model.id,
                  name: trimData.name
                }
              },
              update: {
                msrpCents,
                baseMF: Number(trimData.mf || 0),
                baseAPR: Number(trimData.apr || 0),
                rv36: Number(trimData.rv36 || 0),
                leaseCashCents
              },
              create: {
                modelId: model.id,
                name: trimData.name,
                msrpCents,
                baseMF: Number(trimData.mf || 0),
                baseAPR: Number(trimData.apr || 0),
                rv36: Number(trimData.rv36 || 0),
                leaseCashCents
              }
            });
            trimsCreated++;
          }
        }
      }
    }
  }

  console.log(`Migration complete!`);
  console.log(`Makes created/updated: ${makesCreated}`);
  console.log(`Models created/updated: ${modelsCreated}`);
  console.log(`Trims created/updated: ${trimsCreated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
