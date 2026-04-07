import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      lenderId: { not: null }
    },
    include: { lender: true }
  });
  
  const lenders = new Set(programs.map(p => p.lender?.name));
  console.log(Array.from(lenders));
}

run();
