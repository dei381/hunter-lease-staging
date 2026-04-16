import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const deals = await prisma.dealRecord.findMany({
    where: { publishStatus: 'PUBLISHED' },
    take: 1
  });
  
  for (const deal of deals) {
    const financialData = JSON.parse(deal.financialData);
    console.log(JSON.stringify(financialData, null, 2));
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
