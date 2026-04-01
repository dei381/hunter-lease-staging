import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Lenders...');

  const lenders = [
    { name: 'Toyota Financial Services', isCaptive: true, lenderType: 'CAPTIVE' },
    { name: 'BMW Financial Services', isCaptive: true, lenderType: 'CAPTIVE' },
    { name: 'Kia Finance America', isCaptive: true, lenderType: 'CAPTIVE' },
    { name: 'Honda Financial Services', isCaptive: true, lenderType: 'CAPTIVE' },
    { name: 'Digital Federal Credit Union (DCU)', isCaptive: false, lenderType: 'CREDIT_UNION' },
    { name: 'Navy Federal Credit Union', isCaptive: false, lenderType: 'CREDIT_UNION' },
    { name: 'Chase Bank', isCaptive: false, lenderType: 'NATIONAL_BANK' },
    { name: 'Bank of America', isCaptive: false, lenderType: 'NATIONAL_BANK' }
  ];

  for (const lender of lenders) {
    await prisma.lender.upsert({
      where: { name: lender.name },
      update: {},
      create: lender
    });
  }

  console.log('Lenders seeded!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
