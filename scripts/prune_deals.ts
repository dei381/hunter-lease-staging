import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const allowedMakes = ['Kia', 'Hyundai', 'Toyota', 'Lexus', 'Honda', 'Acura'];
  
  const allDeals = await prisma.dealRecord.findMany();
  let deletedCount = 0;
  
  for (const deal of allDeals) {
    try {
      const data = JSON.parse(deal.financialData);
      const make = data.make || '';
      
      const isAllowed = allowedMakes.some(a => make.toLowerCase() === a.toLowerCase());
      
      if (!isAllowed || deal.type === 'mock') {
        // If it's a legacy or lease type but not allowed make, delete it
        await prisma.dealRecord.delete({ where: { id: deal.id } });
        deletedCount++;
      }
    } catch (e) {
      // bad JSON or something, delete it
      await prisma.dealRecord.delete({ where: { id: deal.id } });
      deletedCount++;
    }
  }
  
  console.log(`Deleted ${deletedCount} deals.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
