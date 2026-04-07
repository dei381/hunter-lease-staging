import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      model: '4Runner',
      lenderId: null,
      term: 36,
      mileage: 10000
    },
    include: { lender: true }
  });
  console.log(programs.map(p => ({ lender: p.lender?.name || 'TFS', trim: p.trim })));
}

run();
