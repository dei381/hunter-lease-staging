import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Check VehicleMake / VehicleModel names (exact casing matters!)
  const makes = await prisma.vehicleMake.findMany({ where: { isActive: true }, include: { models: { where: { isActive: true }, include: { trims: true } } } });
  console.log('\n=== VehicleMakes + Models ===');
  for (const m of makes) {
    console.log(`Make: "${m.name}"`);
    for (const mo of m.models) {
      console.log(`  Model: "${mo.name}", years: ${mo.years}`);
      for (const t of mo.trims) {
        console.log(`    Trim: "${t.name}", msrpCents: ${t.msrpCents}`);
      }
    }
  }

  // Simulate exactly what DataResolver.resolvePrograms does for BMW 3 Series 2024 LEASE term=36
  const testMake = 'BMW';
  const testModel = '3 Series';
  const testYear = 2024;
  const testTerm = 36;

  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  console.log(`\n=== Active batch: ${activeBatch?.id} ===`);

  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch!.id,
      programType: 'LEASE',
      make: { in: [testMake, 'ALL', ''] },
      model: { in: [testModel, 'ALL', ''] },
      trim: { in: ['330i', 'ALL', ''] },
      year: { in: [testYear, 0] },
      term: testTerm,
      mileage: 10000
    }
  });

  console.log(`\n=== Programs found for BMW/3 Series/2024/LEASE/36mo: ${programs.length} ===`);
  console.table(programs.map(p => ({ make: p.make, model: p.model, year: p.year, term: p.term, rv: p.rv, mf: p.mf, lenderId: p.lenderId?.slice(0,8) })));

  // Check VehicleCache (deals may reference these)
  const vcCount = await prisma.vehicleCache.count();
  console.log(`\n=== VehicleCache count: ${vcCount} ===`);
  const vcs = await prisma.vehicleCache.findMany({ take: 5 });
  console.table(vcs.map(v => ({ id: v.id.slice(0,8), make: v.make, model: v.model, msrpCents: v.msrpCents })));

  await prisma.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
