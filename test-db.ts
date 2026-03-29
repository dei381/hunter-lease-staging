import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const vehicles = await prisma.vehicleCache.count();
  const lenders = await prisma.lender.count();
  const programs = await prisma.leaseProgram.count();
  const deals = await prisma.dealRecord.count();
  console.log(`Vehicles: ${vehicles}, Lenders: ${lenders}, Programs: ${programs}, Deals: ${deals}`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
