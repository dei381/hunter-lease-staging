import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  console.log('Active batch:', batch);
  if (batch) {
    const programs = await prisma.bankProgram.findMany({ where: { batchId: batch.id } });
    console.log('Programs count:', programs.length);
    const mileages = new Set(programs.map(p => p.mileage));
    console.log('Distinct mileages:', Array.from(mileages));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
