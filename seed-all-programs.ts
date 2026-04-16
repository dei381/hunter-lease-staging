/**
 * Seed bank programs for ALL active vehicle trims in the database.
 * Creates LEASE + FINANCE programs for each trim in the ACTIVE batch.
 */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const SEGMENT_DEFAULTS: Record<string, { mf: number; rv: number; apr: number; leaseCash: number }> = {
  // Target 10 brands from client
  'Acura':        { mf: 0.0010, rv: 0.55, apr: 4.49, leaseCash: 500 },
  'Chevrolet':    { mf: 0.0014, rv: 0.50, apr: 5.29, leaseCash: 1000 },
  'Ford':         { mf: 0.0013, rv: 0.52, apr: 4.99, leaseCash: 750 },
  'Genesis':      { mf: 0.0012, rv: 0.53, apr: 4.99, leaseCash: 1500 },
  'Hyundai':      { mf: 0.0012, rv: 0.52, apr: 4.99, leaseCash: 750 },
  'Kia':          { mf: 0.0013, rv: 0.51, apr: 4.99, leaseCash: 1000 },
  'Lexus':        { mf: 0.00085, rv: 0.58, apr: 4.49, leaseCash: 500 },
  'RAM':          { mf: 0.0014, rv: 0.50, apr: 5.29, leaseCash: 2000 },
  'Toyota':       { mf: 0.00065, rv: 0.60, apr: 4.49, leaseCash: 500 },
  'Volvo':        { mf: 0.0018, rv: 0.50, apr: 5.49, leaseCash: 1000 },
  // Additional brands in DB
  'BMW':          { mf: 0.0013, rv: 0.54, apr: 5.49, leaseCash: 0 },
  'Mercedes-Benz':{ mf: 0.0015, rv: 0.51, apr: 5.29, leaseCash: 0 },
  'Audi':         { mf: 0.0014, rv: 0.52, apr: 4.99, leaseCash: 0 },
  'Volkswagen':   { mf: 0.0014, rv: 0.51, apr: 5.29, leaseCash: 750 },
  'Honda':        { mf: 0.0008, rv: 0.58, apr: 4.49, leaseCash: 500 },
  'Nissan':       { mf: 0.0015, rv: 0.50, apr: 5.49, leaseCash: 1000 },
  'Mazda':        { mf: 0.0012, rv: 0.53, apr: 4.99, leaseCash: 500 },
  'Subaru':       { mf: 0.0010, rv: 0.55, apr: 4.49, leaseCash: 500 },
  'Jeep':         { mf: 0.0015, rv: 0.49, apr: 5.49, leaseCash: 1500 },
  'Dodge':        { mf: 0.0015, rv: 0.49, apr: 5.49, leaseCash: 1500 },
  'GMC':          { mf: 0.0014, rv: 0.50, apr: 5.29, leaseCash: 1000 },
  'Buick':        { mf: 0.0014, rv: 0.51, apr: 5.29, leaseCash: 1000 },
  'Chrysler':     { mf: 0.0015, rv: 0.48, apr: 5.49, leaseCash: 1500 },
  'Infiniti':     { mf: 0.0015, rv: 0.50, apr: 5.49, leaseCash: 750 },
  'Lincoln':      { mf: 0.0012, rv: 0.50, apr: 4.99, leaseCash: 1000 },
  'Cadillac':     { mf: 0.0013, rv: 0.51, apr: 4.99, leaseCash: 1000 },
  'Land Rover':   { mf: 0.0020, rv: 0.48, apr: 5.99, leaseCash: 0 },
  'Jaguar':       { mf: 0.0018, rv: 0.47, apr: 5.99, leaseCash: 0 },
  'Porsche':      { mf: 0.0015, rv: 0.56, apr: 5.49, leaseCash: 0 },
  'MINI':         { mf: 0.0015, rv: 0.52, apr: 5.29, leaseCash: 0 },
  'Mitsubishi':   { mf: 0.0016, rv: 0.48, apr: 5.99, leaseCash: 1000 },
  'Alfa Romeo':   { mf: 0.0018, rv: 0.47, apr: 5.99, leaseCash: 1500 },
};
const DEFAULT = { mf: 0.0015, rv: 0.50, apr: 5.49, leaseCash: 500 };

async function main() {
  // Find active batch
  let batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!batch) {
    batch = await prisma.programBatch.create({
      data: { status: 'ACTIVE', isValid: true, publishedAt: new Date() }
    });
    console.log('Created new ACTIVE batch:', batch.id);
  }
  console.log('Using batch:', batch.id);

  // Get all active trims with MSRP
  const trims = await prisma.vehicleTrim.findMany({
    where: { isActive: true, msrpCents: { gt: 0 } },
    include: { model: { include: { make: true } } }
  });
  console.log(`Found ${trims.length} active trims with MSRP`);

  // Check existing programs to avoid duplicates
  const existing = await prisma.bankProgram.findMany({
    where: { batchId: batch.id },
    select: { make: true, model: true, trim: true, year: true, term: true, programType: true, mileage: true }
  });
  const existingKeys = new Set(existing.map(e => 
    `${e.programType}|${e.make}|${e.model}|${e.trim}|${e.year}|${e.term}|${e.mileage || 0}`
  ));
  console.log(`Existing programs: ${existing.length}`);

  const terms = [24, 36, 48];
  const financeTerms = [36, 48, 60, 72];
  let created = 0;
  const programsToCreate: any[] = [];

  for (const trim of trims) {
    const makeName = trim.model.make.name;
    const d = SEGMENT_DEFAULTS[makeName] || DEFAULT;
    const year = trim.model.years?.[0] || 2025;

    // LEASE programs
    for (const t of terms) {
      const key = `LEASE|${makeName}|${trim.model.name}|${trim.name}|${year}|${t}|10000`;
      if (existingKeys.has(key)) continue;

      // RV adjusts by term: 36mo = base, 24mo = base+5%, 48mo = base-5%
      const rvAdj = t === 24 ? 0.05 : t === 48 ? -0.05 : 0;
      programsToCreate.push({
        batchId: batch.id,
        programType: 'LEASE',
        make: makeName,
        model: trim.model.name,
        trim: trim.name,
        year,
        term: t,
        mileage: 10000,
        mf: d.mf,
        rv: d.rv + rvAdj,
        rebates: d.leaseCash
      });
    }

    // FINANCE programs
    for (const t of financeTerms) {
      const key = `FINANCE|${makeName}|${trim.model.name}|${trim.name}|${year}|${t}|0`;
      if (existingKeys.has(key)) continue;

      // APR adjusts by term: shorter = lower, longer = higher
      const aprAdj = t <= 36 ? -0.5 : t === 48 ? 0 : t === 60 ? 0.5 : 1.0;
      programsToCreate.push({
        batchId: batch.id,
        programType: 'FINANCE',
        make: makeName,
        model: trim.model.name,
        trim: trim.name,
        year,
        term: t,
        mileage: 0,
        apr: d.apr + aprAdj,
        rebates: 0
      });
    }
  }

  console.log(`Creating ${programsToCreate.length} new programs...`);

  // Batch create in chunks of 100
  for (let i = 0; i < programsToCreate.length; i += 100) {
    const chunk = programsToCreate.slice(i, i + 100);
    await prisma.bankProgram.createMany({ data: chunk });
    created += chunk.length;
    process.stdout.write(`  ${created}/${programsToCreate.length}\r`);
  }

  console.log(`\nCreated ${created} bank programs`);

  // Also update VehicleTrim defaults (MF, RV, APR) for trims without them
  const trimsWithoutDefaults = trims.filter(t => t.baseMF === 0 && t.rv36 === 0);
  let updatedTrims = 0;
  for (const trim of trimsWithoutDefaults) {
    const makeName = trim.model.make.name;
    const d = SEGMENT_DEFAULTS[makeName] || DEFAULT;
    await prisma.vehicleTrim.update({
      where: { id: trim.id },
      data: { baseMF: d.mf, rv36: d.rv, baseAPR: d.apr, leaseCashCents: d.leaseCash * 100 }
    });
    updatedTrims++;
  }
  console.log(`Updated ${updatedTrims} trims with default financial params`);

  // Final count
  const total = await prisma.bankProgram.count({ where: { batchId: batch.id } });
  console.log(`Total programs in active batch: ${total}`);

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
