import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return;

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      make: 'Toyota',
      term: 36,
      mileage: 10000
    },
    include: { lender: true }
  });
  
  const modelsWithBoth = new Set<string>();
  const modelsWithTfs = new Set<string>();
  const modelsWithOther = new Set<string>();
  
  for (const p of programs) {
    if (p.lenderId === null) {
      modelsWithTfs.add(p.model);
    } else {
      modelsWithOther.add(p.model);
    }
  }
  
  for (const m of modelsWithTfs) {
    if (modelsWithOther.has(m)) {
      modelsWithBoth.add(m);
    }
  }
  
  console.log('Models with both TFS and other lenders:', Array.from(modelsWithBoth));
}

run();
