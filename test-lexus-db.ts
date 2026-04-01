import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function test() {
  const model = await prisma.vehicleModel.findFirst({ where: { name: 'NX 350' } });
  const trims = await prisma.vehicleTrim.findMany({ where: { modelId: model?.id } });
  console.log(trims.map(t => t.name));
}
test();
