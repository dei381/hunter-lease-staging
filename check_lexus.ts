import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deals = await prisma.dealRecord.findMany({
    where: {
      financialData: {
        contains: "LS 500"
      }
    }
  });
  
  for (const deal of deals) {
    console.log(`Deal ID: ${deal.id}`);
    console.log(`Financial Data: ${deal.financialData}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
