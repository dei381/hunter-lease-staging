import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const make = await prisma.vehicleMake.findFirst({ where: { name: 'Toyota' } });
  if (!make) { console.log('NO Toyota make'); return; }
  const model = await prisma.vehicleModel.findFirst({ where: { name: 'Camry', makeId: make.id } });
  if (!model) { console.log('NO Camry model'); return; }
  const trims = await prisma.vehicleTrim.findMany({ where: { modelId: model.id } });
  console.log('=== VehicleTrim (Toyota Camry) ===');
  for (const t of trims) {
    console.log(`  ${t.name.padEnd(20)} msrp=${t.msrpCents/100} mf=${t.baseMF} rv36=${t.rv36} apr=${t.baseAPR} leaseCash=${t.leaseCashCents/100}`);
  }

  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) { console.log('NO active program batch'); return; }
  console.log(`\n=== BankProgram (active batch ${activeBatch.id}) Toyota Camry 2026 LEASE ===`);
  const programs = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id,
      programType: 'LEASE',
      make: 'Toyota',
      model: 'Camry',
      year: 2026,
    },
    orderBy: [{ trim: 'asc' }, { term: 'asc' }, { mileage: 'asc' }],
  });
  for (const p of programs) {
    console.log(`  trim=${(p.trim||'').padEnd(15)} term=${p.term} mi=${p.mileage} rv=${p.rv} mf=${p.mf} rebates=${p.rebates}`);
  }
}

main().finally(() => prisma.$disconnect());
