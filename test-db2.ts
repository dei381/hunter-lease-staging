import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const bankPrograms = await prisma.bankProgram.count();
  const batches = await prisma.programBatch.count();
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  console.log(`BankPrograms: ${bankPrograms}, Batches: ${batches}, Active Batch: ${activeBatch?.id}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
