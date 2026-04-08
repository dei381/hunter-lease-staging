import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      model: 'Camry',
      term: 36,
      mileage: 10000
    },
    include: { lender: true }
  });
  console.log(JSON.stringify(programs, null, 2));
}

run();
