import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const lenders = await prisma.lender.findMany({ take: 10 });
  console.log('\n=== Lenders ===');
  console.table(lenders.map(l => ({ id: l.id.slice(0,8), name: l.name, captive: l.isCaptive, active: l.isActive })));

  const batches = await prisma.programBatch.findMany({ where: { status: 'ACTIVE' }, take: 5 });
  console.log('\n=== Active ProgramBatches ===');
  console.table(batches.map(b => ({ id: b.id.slice(0,8), status: b.status, desc: b.description, published: b.publishedAt })));

  const bpCount = await prisma.bankProgram.count();
  console.log(`\n=== BankProgram count: ${bpCount} ===`);

  if (bpCount > 0) {
    const bps = await prisma.bankProgram.findMany({ take: 5 });
    console.table(bps.map(b => ({ type: b.programType, make: b.make, model: b.model, term: b.term, mf: b.mf, rv: b.rv, apr: b.apr })));
  }

  const trimsNoMsrp = await prisma.vehicleTrim.count({ where: { msrpCents: 0, isActive: true } });
  console.log(`\n=== VehicleTrims without MSRP: ${trimsNoMsrp} ===`);

  const trims = await prisma.vehicleTrim.findMany({ where: { isActive: true }, take: 10 });
  console.log('\n=== VehicleTrims (sample) ===');
  console.table(trims.map(t => ({ name: t.name, msrpCents: t.msrpCents, baseMF: t.baseMF, rv36: t.rv36 })));

  const users = await prisma.user.findMany({ take: 10 });
  console.log('\n=== Users ===');
  console.table(users.map(u => ({ email: u.email, role: u.role, hasFb: !!u.firebaseUid })));

  await prisma.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
