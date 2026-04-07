import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deals = await prisma.dealRecord.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' }
  });
  
  for (const deal of deals) {
    console.log(`Deal ID: ${deal.id}`);
    console.log(`Financial Data: ${deal.financialData}`);
    console.log('---');
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
