import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const deals = await prisma.dealRecord.groupBy({
    by: ['publishStatus'],
    _count: true
  });
  console.log(deals);
}

check().catch(console.error).finally(() => prisma.$disconnect());
