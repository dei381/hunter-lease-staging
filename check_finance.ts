import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  console.log('Active batch:', activeBatch?.id);

  if (activeBatch) {
    const programs = await prisma.bankProgram.findMany({
      where: { 
        batchId: activeBatch.id,
        programType: 'FINANCE',
        make: 'Toyota',
        model: 'Corolla'
      }
    });
    console.log(`Finance programs for Toyota Corolla:`);
    programs.forEach(p => console.log(`Term: ${p.term}, Trim: ${p.trim}, APR: ${p.apr}`));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
