import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (activeBatch) {
    const allFinance = await prisma.bankProgram.findMany({
      where: { batchId: activeBatch.id, programType: 'FINANCE' },
      select: { term: true },
      distinct: ['term']
    });
    console.log(`Available Finance terms in batch:`, allFinance.map(p => p.term));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
