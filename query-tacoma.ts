import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const p = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      model: 'Tacoma',
      trim: 'TRD Off-Road'
    }
  });
  console.log(p);
}

run();
