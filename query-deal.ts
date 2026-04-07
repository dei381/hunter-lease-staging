import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const deal = await prisma.dealRecord.findUnique({ where: { id: '2b6abd47-5137-4caa-b742-c069f7404077' } });
  console.log(deal?.financialData);
}

run();
