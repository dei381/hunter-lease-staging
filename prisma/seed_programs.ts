import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed BankPrograms from cars.json...');

  // 1. Ensure we have an active batch
  let activeBatch = await prisma.programBatch.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!activeBatch) {
    activeBatch = await prisma.programBatch.create({
      data: {
        status: 'ACTIVE'
      }
    });
    console.log(`Created new active batch: ${activeBatch.id}`);
  } else {
    console.log(`Using existing active batch: ${activeBatch.id}`);
  }

  // 2. Load cars.json
  const carsPath = path.join(process.cwd(), 'server/data/cars.json');
  const carDb = JSON.parse(fs.readFileSync(carsPath, 'utf-8'));

  let leaseProgramsCreated = 0;
  let financeProgramsCreated = 0;

  // 3. Iterate over cars.json and create BankPrograms
  for (const make of carDb.makes || []) {
    for (const model of make.models || []) {
      const year = model.years?.[0] || 2024;
      for (const trim of model.trims || []) {
        if (trim.mf || trim.rv36) {
          // Upsert Lease Program
          const existingLease = await prisma.bankProgram.findFirst({
            where: {
              batchId: activeBatch.id,
              programType: 'LEASE',
              make: make.name,
              model: model.name,
              trim: trim.name,
              year: year,
              term: 36
            }
          });

          if (!existingLease) {
            await prisma.bankProgram.create({
              data: {
                batchId: activeBatch.id,
                programType: 'LEASE',
                make: make.name,
                model: model.name,
                trim: trim.name,
                year: year,
                term: 36,
                mileage: 10000,
                mf: trim.mf || 0.002,
                rv: trim.rv36 || 0.55,
                rebates: (trim.leaseCash || 0) * 100
              }
            });
            leaseProgramsCreated++;
          }
        }

        if (trim.baseAPR) {
          // Upsert Finance Program
          const existingFinance = await prisma.bankProgram.findFirst({
            where: {
              batchId: activeBatch.id,
              programType: 'FINANCE',
              make: make.name,
              model: model.name,
              trim: trim.name,
              year: year,
              term: 60
            }
          });

          if (!existingFinance) {
            await prisma.bankProgram.create({
              data: {
                batchId: activeBatch.id,
                programType: 'FINANCE',
                make: make.name,
                model: model.name,
                trim: trim.name,
                year: year,
                term: 60,
                apr: trim.baseAPR || 4.9,
                rebates: (trim.financeCash || 0) * 100
              }
            });
            financeProgramsCreated++;
          }
        }
      }
    }
  }

  console.log(`Seeding complete! Created ${leaseProgramsCreated} lease programs and ${financeProgramsCreated} finance programs.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
