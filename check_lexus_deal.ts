import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const deal = await prisma.dealRecord.findUnique({
    where: { id: "35cd6483-a7c6-46c9-a9c1-6fbba5c68ecd" }
  });
  console.log(deal);
}

main().catch(console.error).finally(() => prisma.$disconnect());
