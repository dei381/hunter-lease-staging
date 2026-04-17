import prisma from './server/lib/db';

async function main() {
  const batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!batch) {
    console.log('NO ACTIVE BATCH!');
    return;
  }

  const count = await prisma.bankProgram.count({ where: { batchId: batch.id } });
  const byType = await prisma.bankProgram.groupBy({
    by: ['programType'],
    where: { batchId: batch.id },
    _count: true
  });
  const incentiveCount = await prisma.oemIncentiveProgram.count({ where: { isActive: true } });

  console.log('Active batch:', batch.id);
  console.log('Programs:', count);
  console.log('By type:', JSON.stringify(byType));
  console.log('Incentives:', incentiveCount);

  const brands = await prisma.bankProgram.groupBy({
    by: ['make'],
    where: { batchId: batch.id },
    _count: true
  });
  console.log('Brands with programs:', brands.map(b => `${b.make}:${b._count}`).join(', '));

  // Check target brands specifically
  const targetBrands = ['Acura', 'Chevrolet', 'Ford', 'Genesis', 'Hyundai', 'Kia', 'Lexus', 'RAM', 'Toyota', 'Volvo'];
  for (const brand of targetBrands) {
    const c = await prisma.bankProgram.count({
      where: { batchId: batch.id, make: brand }
    });
    const inc = await prisma.oemIncentiveProgram.count({
      where: { isActive: true, make: brand }
    });
    console.log(`  ${brand}: ${c} programs, ${inc} incentives`);
  }

  // Check trims for target brands
  const trimCount = await prisma.vehicleTrim.count({
    where: {
      isActive: true,
      msrpCents: { gte: 1800000 },
      model: { make: { name: { in: targetBrands } } }
    }
  });
  console.log('Target brand trims (MSRP >= $18k):', trimCount);

  // Check RAM case
  const ramProgs = await prisma.bankProgram.groupBy({
    by: ['make'],
    where: { make: { contains: 'am', mode: 'insensitive' } },
    _count: true
  });
  console.log('Ram-like program brands:', ramProgs.map(r => `${r.make}:${r._count}`));

  const ramMakes = await prisma.vehicleMake.findMany({
    where: { name: { contains: 'am', mode: 'insensitive' } },
    select: { name: true }
  });
  console.log('Ram-like VehicleMake names:', ramMakes.map(m => m.name));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
