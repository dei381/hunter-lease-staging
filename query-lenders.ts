import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const lenders = await prisma.lender.findMany();
  console.log(JSON.stringify(lenders, null, 2));
}

run();
