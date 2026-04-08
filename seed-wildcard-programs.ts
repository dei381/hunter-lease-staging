import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const bmwLender = await prisma.lender.findFirst({ where: { name: 'BMW Financial Services' } });
  const mbLender  = await prisma.lender.findFirst({ where: { name: 'Mercedes-Benz Financial Services' } });
  const batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });

  if (!bmwLender || !mbLender || !batch) {
    console.error('Missing lenders or batch. Run seed-bank-programs.ts first.'); process.exit(1);
  }

  // Wildcard year=0 programs — match any year
  const wildcards = [
    { programType: 'LEASE',   make: 'BMW',           model: '3 Series', trim: 'ALL', year: 0, term: 24, mileage: 10000, rv: 0.60, mf: 0.00125, apr: null, lenderId: bmwLender.id },
    { programType: 'LEASE',   make: 'BMW',           model: '3 Series', trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.54, mf: 0.00130, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW',           model: '3 Series', trim: 'ALL', year: 0, term: 36, mileage: null,  rv: null, mf: null, apr: 5.49, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW',           model: '3 Series', trim: 'ALL', year: 0, term: 48, mileage: null,  rv: null, mf: null, apr: 5.99, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW',           model: '3 Series', trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 6.29, lenderId: bmwLender.id },
    { programType: 'LEASE',   make: 'BMW',           model: 'X5',       trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.56, mf: 0.00120, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW',           model: 'X5',       trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 5.99, lenderId: bmwLender.id },
    { programType: 'LEASE',   make: 'BMW',           model: '5 Series', trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.52, mf: 0.00140, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW',           model: '5 Series', trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 5.99, lenderId: bmwLender.id },
    { programType: 'LEASE',   make: 'Mercedes-Benz', model: 'C-Class',  trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.51, mf: 0.00150, apr: null, lenderId: mbLender.id },
    { programType: 'FINANCE', make: 'Mercedes-Benz', model: 'C-Class',  trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 6.29, lenderId: mbLender.id },
    { programType: 'LEASE',   make: 'Mercedes-Benz', model: 'E-Class',  trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.50, mf: 0.00160, apr: null, lenderId: mbLender.id },
    { programType: 'FINANCE', make: 'Mercedes-Benz', model: 'E-Class',  trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 6.49, lenderId: mbLender.id },
    { programType: 'LEASE',   make: 'Audi',          model: 'A4',       trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.52, mf: 0.00140, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'Audi',          model: 'A4',       trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 5.99, lenderId: bmwLender.id },
    { programType: 'LEASE',   make: 'Audi',          model: 'Q5',       trim: 'ALL', year: 0, term: 36, mileage: 10000, rv: 0.53, mf: 0.00135, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'Audi',          model: 'Q5',       trim: 'ALL', year: 0, term: 60, mileage: null,  rv: null, mf: null, apr: 5.79, lenderId: bmwLender.id },
  ];

  await prisma.bankProgram.createMany({
    data: wildcards.map(w => ({ ...w, batchId: batch.id, rebates: 0 })),
    skipDuplicates: true
  });

  const total = await prisma.bankProgram.count();
  console.log(`Done. Total BankPrograms: ${total}`);
  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
