import { PrismaClient } from './node_modules/.prisma/client';
const p = new PrismaClient();

async function main() {
  const incs = await p.oemIncentiveProgram.findMany({
    where: { make: 'Toyota', isActive: true },
    select: { id: true, name: true, amountCents: true, type: true, model: true, dealApplicability: true, trim: true }
  });
  console.log(JSON.stringify(incs, null, 2));
  console.log(`Total: ${incs.length}`);
  await p.$disconnect();
}
main();
