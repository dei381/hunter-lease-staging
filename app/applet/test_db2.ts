import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function run() {
  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) return console.log('no active batch');
  const progs = await prisma.bankProgram.findMany({ where: { batchId: activeBatch.id, make: { contains: 'Volkswagen' } } });
  console.log(`Volkswagen BankPrograms: ${progs.length}`);
  const vdpProgs = await prisma.leaseProgram.findMany({ where: { make: { contains: 'Volkswagen' } } });
  console.log(`Volkswagen LeasePrograms: ${vdpProgs.length}`);
}
run().finally(() => prisma.$disconnect());
