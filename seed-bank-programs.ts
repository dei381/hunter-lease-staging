import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // 1. Create lenders
  let bmwLender = await prisma.lender.findFirst({ where: { name: 'BMW Financial Services' } });
  if (!bmwLender) {
    bmwLender = await prisma.lender.create({
      data: { name: 'BMW Financial Services', isCaptive: true, lenderType: 'CAPTIVE', priority: 1, isActive: true }
    });
    console.log('Created: BMW Financial Services');
  } else {
    console.log('Exists: BMW Financial Services', bmwLender.id);
  }

  let mbLender = await prisma.lender.findFirst({ where: { name: 'Mercedes-Benz Financial Services' } });
  if (!mbLender) {
    mbLender = await prisma.lender.create({
      data: { name: 'Mercedes-Benz Financial Services', isCaptive: true, lenderType: 'CAPTIVE', priority: 1, isActive: true }
    });
    console.log('Created: Mercedes-Benz Financial Services');
  } else {
    console.log('Exists: Mercedes-Benz Financial Services', mbLender.id);
  }

  // 2. Update existing BankPrograms without lenderId
  const orphanPrograms = await prisma.bankProgram.findMany({ where: { lenderId: null } });
  if (orphanPrograms.length > 0) {
    for (const p of orphanPrograms) {
      const lid = p.make === 'Mercedes-Benz' ? mbLender.id : bmwLender.id;
      await prisma.bankProgram.update({ where: { id: p.id }, data: { lenderId: lid } });
    }
    console.log(`Linked ${orphanPrograms.length} orphan programs to lenders`);
  }

  // 3. Get or create active batch
  let batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!batch) {
    batch = await prisma.programBatch.create({
      data: { status: 'ACTIVE', isValid: true, description: 'Default seed programs', publishedAt: new Date() }
    });
    console.log('Created ProgramBatch:', batch.id);
  } else {
    console.log('Using existing batch:', batch.id);
  }

  // 4. Seed new programs (skip duplicates by checking existing)
  const existing = await prisma.bankProgram.findMany({ where: { batchId: batch.id } });
  const existingKey = (p: any) => `${p.programType}|${p.make}|${p.model}|${p.term}|${p.year}|${p.mileage}`;
  const existingKeys = new Set(existing.map(existingKey));

  const seeds = [
    // BMW 3 Series
    { programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 24, mileage: 10000, rv: 0.62, mf: 0.00125, apr: null, lenderId: bmwLender.id },
    { programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.55, mf: 0.00125, apr: null, lenderId: bmwLender.id },
    { programType: 'LEASE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2024, term: 36, mileage: 10000, rv: 0.52, mf: 0.00135, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 36, mileage: null, rv: null, mf: null, apr: 4.9, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 48, mileage: null, rv: null, mf: null, apr: 5.49, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW', model: '3 Series', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.9, lenderId: bmwLender.id },
    // BMW X5
    { programType: 'LEASE', make: 'BMW', model: 'X5', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.58, mf: 0.00115, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW', model: 'X5', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.49, lenderId: bmwLender.id },
    // BMW 5 Series
    { programType: 'LEASE', make: 'BMW', model: '5 Series', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.52, mf: 0.00140, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'BMW', model: '5 Series', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.69, lenderId: bmwLender.id },
    // Mercedes C-Class
    { programType: 'LEASE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.53, mf: 0.00145, apr: null, lenderId: mbLender.id },
    { programType: 'LEASE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2024, term: 36, mileage: 10000, rv: 0.50, mf: 0.00155, apr: null, lenderId: mbLender.id },
    { programType: 'FINANCE', make: 'Mercedes-Benz', model: 'C-Class', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.99, lenderId: mbLender.id },
    // Mercedes E-Class
    { programType: 'LEASE', make: 'Mercedes-Benz', model: 'E-Class', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.50, mf: 0.00160, apr: null, lenderId: mbLender.id },
    { programType: 'FINANCE', make: 'Mercedes-Benz', model: 'E-Class', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 6.29, lenderId: mbLender.id },
    // Audi A4
    { programType: 'LEASE', make: 'Audi', model: 'A4', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.52, mf: 0.00140, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'Audi', model: 'A4', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.79, lenderId: bmwLender.id },
    // Audi Q5
    { programType: 'LEASE', make: 'Audi', model: 'Q5', trim: 'ALL', year: 2025, term: 36, mileage: 10000, rv: 0.54, mf: 0.00130, apr: null, lenderId: bmwLender.id },
    { programType: 'FINANCE', make: 'Audi', model: 'Q5', trim: 'ALL', year: 2025, term: 60, mileage: null, rv: null, mf: null, apr: 5.59, lenderId: bmwLender.id },
  ];

  const toInsert = seeds.filter(s => {
    const key = `${s.programType}|${s.make}|${s.model}|${s.term}|${s.year}|${s.mileage}`;
    return !existingKeys.has(key);
  });

  if (toInsert.length > 0) {
    await prisma.bankProgram.createMany({
      data: toInsert.map(s => ({ ...s, batchId: batch!.id, rebates: 0 }))
    });
    console.log(`Inserted ${toInsert.length} new BankPrograms`);
  } else {
    console.log('All programs already exist, nothing to insert');
  }

  // 5. Verify
  const total = await prisma.bankProgram.count();
  const lenders = await prisma.lender.findMany();
  console.log(`\nFinal state: ${total} BankPrograms, ${lenders.length} Lenders`);
  console.table(lenders.map(l => ({ name: l.name, id: l.id.slice(0, 8) })));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
