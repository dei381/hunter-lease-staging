import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- Starting MVP Financial Layer Test Pipeline ---');

  // 1. Import Mock Batch
  console.log('\n1. Importing Mock Batch...');
  const mockPrograms = [
    {
      programType: "LEASE",
      make: "Toyota",
      model: "Camry",
      trim: "LE",
      year: 2024,
      term: 36,
      mileage: 10000,
      rv: 0.55,
      mf: 0.00125,
      apr: null,
      rebates: 500
    },
    {
      programType: "FINANCE",
      make: "Toyota",
      model: "Camry",
      trim: "LE",
      year: 2024,
      term: 60,
      mileage: null,
      rv: null,
      mf: null,
      apr: 0.049,
      rebates: 1000
    }
  ];

  const batch = await prisma.programBatch.create({
    data: {
      status: 'DRAFT',
      programs: {
        create: mockPrograms
      }
    }
  });
  console.log(`Created DRAFT batch: ${batch.id}`);

  // 2. Validate Batch
  console.log('\n2. Validating Batch...');
  const programs = await prisma.bankProgram.findMany({ where: { batchId: batch.id } });
  
  let isValid = true;
  const errors: any[] = [];

  if (programs.length === 0) {
    isValid = false;
    errors.push({ error: 'Batch is empty' });
  }

  programs.forEach((p, i) => {
    if (p.programType === 'LEASE') {
      if (p.rv === null || p.mf === null) {
        isValid = false;
        errors.push({ row: i, error: 'Missing RV or MF for LEASE' });
      }
    } else if (p.programType === 'FINANCE') {
      if (p.apr === null) {
        isValid = false;
        errors.push({ row: i, error: 'Missing APR for FINANCE' });
      }
    }
  });

  await prisma.programBatch.update({
    where: { id: batch.id },
    data: { isValid, validationErrors: errors.length ? JSON.stringify(errors) : null }
  });
  console.log(`Validation complete. isValid: ${isValid}`);

  // 3. Publish Batch
  console.log('\n3. Publishing Batch...');
  if (!isValid) {
    console.log('Cannot publish invalid batch.');
    return;
  }

  await prisma.$transaction(async (tx) => {
    await tx.programBatch.updateMany({
      where: { status: 'ACTIVE' },
      data: { status: 'SUPERSEDED' }
    });
    await tx.programBatch.update({
      where: { id: batch.id },
      data: { status: 'ACTIVE' }
    });
  });
  console.log(`Batch ${batch.id} is now ACTIVE.`);

  // 4. Test Calculation (Lease)
  console.log('\n4. Testing Lease Calculation...');
  const activeBatch = await prisma.programBatch.findFirst({
    where: { status: 'ACTIVE' },
    include: { programs: true }
  });

  if (!activeBatch) {
    console.log('No active batch found.');
    return;
  }

  const leaseProgram = activeBatch.programs.find(p => 
    p.programType === 'LEASE' && 
    p.make === 'Toyota' && 
    p.model === 'Camry' && 
    p.term === 36 && 
    p.mileage === 10000
  );

  if (leaseProgram) {
    const msrp = 30000;
    const sellingPrice = 29000;
    const downPayment = 2000;
    const residualValue = msrp * (leaseProgram.rv || 0);
    const adjustedCapCost = sellingPrice - downPayment - (leaseProgram.rebates || 0);
    
    const depreciation = (adjustedCapCost - residualValue) / leaseProgram.term;
    const rentCharge = (adjustedCapCost + residualValue) * (leaseProgram.mf || 0);
    const monthlyPayment = depreciation + rentCharge;

    console.log(`Lease Program Found!`);
    console.log(`MSRP: $${msrp}`);
    console.log(`Selling Price: $${sellingPrice}`);
    console.log(`Down Payment: $${downPayment}`);
    console.log(`Rebates: $${leaseProgram.rebates}`);
    console.log(`Residual Value: $${residualValue}`);
    console.log(`Adjusted Cap Cost: $${adjustedCapCost}`);
    console.log(`Depreciation: $${depreciation.toFixed(2)}`);
    console.log(`Rent Charge: $${rentCharge.toFixed(2)}`);
    console.log(`Monthly Payment: $${monthlyPayment.toFixed(2)}`);
  } else {
    console.log('Lease program not found for calculation.');
  }

  console.log('\n--- Pipeline Test Complete ---');
}

runTest()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });