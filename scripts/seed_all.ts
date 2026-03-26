import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting seed...');
  
  const carsDataPath = path.join(process.cwd(), 'server/data/cars.json');
  const carsData = JSON.parse(fs.readFileSync(carsDataPath, 'utf-8'));
  
  // 1. Update car_db
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(carsData) },
    create: { id: 'car_db', data: JSON.stringify(carsData) }
  });
  console.log('Updated car_db');

  // 2. Create active batch
  let activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) {
    activeBatch = await prisma.programBatch.create({
      data: { status: 'ACTIVE', isValid: true }
    });
  }

  // 3. Populate VehicleCache and BankProgram for all trims
  for (const make of carsData.makes) {
    for (const model of make.models) {
      for (const trim of model.trims) {
        const year = model.years[0] || 2026;
        
        // Upsert VehicleCache
        let vehicle = await prisma.vehicleCache.findFirst({
          where: { make: make.name, model: model.name, year, trim: trim.name }
        });
        
        if (!vehicle) {
          vehicle = await prisma.vehicleCache.create({
            data: {
              make: make.name,
              model: model.name,
              year,
              trim: trim.name,
              msrpCents: (trim.msrp || 30000) * 100,
              features: JSON.stringify(trim.features || [])
            }
          });
        } else {
          await prisma.vehicleCache.update({
            where: { id: vehicle.id },
            data: { msrpCents: (trim.msrp || 30000) * 100 }
          });
        }

        // Upsert BankProgram (Lease)
        const leaseCash = trim.leaseCash || 1000;
        const mf = trim.mf || 0.002;
        const rv = trim.rv36 || 0.60;
        
        const existingLease = await prisma.bankProgram.findFirst({
          where: { batchId: activeBatch.id, programType: 'LEASE', make: make.name, model: model.name, year, trim: trim.name, term: 36 }
        });
        
        if (existingLease) {
          await prisma.bankProgram.update({
            where: { id: existingLease.id },
            data: { mf, rv, rebates: leaseCash * 100 }
          });
        } else {
          await prisma.bankProgram.create({
            data: {
              batchId: activeBatch.id,
              programType: 'LEASE',
              make: make.name, model: model.name, year, trim: trim.name,
              term: 36,
              mileage: 10000,
              mf,
              rv,
              rebates: leaseCash * 100
            }
          });
        }

        // Upsert BankProgram (Finance)
        const apr = trim.baseAPR || 4.9;
        const existingFinance = await prisma.bankProgram.findFirst({
          where: { batchId: activeBatch.id, programType: 'FINANCE', make: make.name, model: model.name, year, trim: trim.name, term: 60 }
        });
        
        if (existingFinance) {
          await prisma.bankProgram.update({
            where: { id: existingFinance.id },
            data: { apr, rebates: leaseCash * 100 }
          });
        } else {
          await prisma.bankProgram.create({
            data: {
              batchId: activeBatch.id,
              programType: 'FINANCE',
              make: make.name, model: model.name, year, trim: trim.name,
              term: 60,
              apr,
              rebates: leaseCash * 100
            }
          });
        }
      }
    }
  }
  console.log('Populated VehicleCache and BankPrograms');
}

main().catch(console.error).finally(() => prisma.$disconnect());
