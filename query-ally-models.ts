import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      lender: { name: 'Ally' }
    },
    include: { lender: true }
  });
  
  const models = new Set(programs.map(p => p.model));
  console.log(Array.from(models));
}

run();
