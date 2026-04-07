import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  let rize = await prisma.lender.findFirst({ where: { name: 'Rize FCU' } });
  if (!rize) {
    rize = await prisma.lender.create({
      data: {
        name: 'Rize FCU',
        isCaptive: false,
        lenderType: 'CREDIT_UNION',
        priority: 10
      }
    });
  }

  await prisma.bankProgram.create({
    data: {
      batchId: activeBatch.id,
      lenderId: rize.id,
      programType: 'LEASE',
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE Hybrid',
      year: 2026,
      term: 36,
      mileage: 10000,
      mf: 0.00150,
      rv: 0.65,
      rebates: 0
    }
  });
  console.log('Created Rize FCU program for Camry LE Hybrid');
}

run();
