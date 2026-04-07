import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const make = await prisma.vehicleMake.findFirst({ where: { name: 'Lexus' } });
  if (!make) return console.log('Lexus not found');
  const model = await prisma.vehicleModel.findFirst({ where: { makeId: make.id, name: 'LS 500' } });
  if (!model) return console.log('LS 500 not found');
  const trims = await prisma.vehicleTrim.findMany({ where: { modelId: model.id } });
  console.log(trims);
}

main().catch(console.error).finally(() => prisma.$disconnect());
