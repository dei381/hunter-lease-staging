import { PrismaClient } from '@prisma/client';
import { DEALS } from '../server/data/deals';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting deals seed...');
  
  await prisma.dealRecord.deleteMany({});
  console.log('Deleted existing deals');

  for (const deal of DEALS) {
    await prisma.dealRecord.create({
      data: {
        type: deal.type || 'lease',
        publishStatus: 'PUBLISHED',
        reviewStatus: 'APPROVED',
        financialData: JSON.stringify(deal),
        payload: JSON.stringify(deal),
      }
    });
  }
  console.log(`Seeded ${DEALS.length} deals`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
