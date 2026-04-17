import prisma from './server/lib/db';

async function main() {
  const updated = await prisma.oemIncentiveProgram.updateMany({
    where: { make: 'RAM' },
    data: { make: 'Ram' }
  });
  console.log('Fixed RAM->Ram incentives:', updated.count);
  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
