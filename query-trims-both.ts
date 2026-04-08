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
  
  const trimLenders = new Map<string, Set<string>>();
  
  for (const p of programs) {
    const key = `${p.model} - ${p.trim}`;
    if (!trimLenders.has(key)) {
      trimLenders.set(key, new Set());
    }
    trimLenders.get(key)!.add(p.lender?.name || 'TFS');
  }
  
  for (const [key, lenders] of trimLenders.entries()) {
    if (lenders.size > 1) {
      console.log(`${key}: ${Array.from(lenders).join(', ')}`);
    }
  }
}

run();
