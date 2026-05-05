import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const NEW_MSRP_CENTS = 3742300;
const NEW_RV = 0.50;
const TARGET_TERM = 36;

async function main() {
  const make = await prisma.vehicleMake.findFirst({ where: { name: 'Toyota' } });
  if (!make) throw new Error('Toyota make not found');
  const model = await prisma.vehicleModel.findFirst({ where: { name: 'Camry', makeId: make.id } });
  if (!model) throw new Error('Camry model not found');
  const xse = await prisma.vehicleTrim.findFirst({ where: { modelId: model.id, name: 'XSE' } });
  if (!xse) throw new Error('Camry XSE trim not found');

  const before = {
    trim: { msrpCents: xse.msrpCents, rv36: xse.rv36 },
  };

  const activeBatch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!activeBatch) throw new Error('No active program batch');

  const programsBefore = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id, programType: 'LEASE',
      make: 'Toyota', model: 'Camry', trim: 'XSE', year: 2026, term: TARGET_TERM,
    },
  });

  console.log('=== BEFORE ===');
  console.log('VehicleTrim XSE:', before.trim);
  console.log(`BankProgram XSE LEASE term=${TARGET_TERM}:`, programsBefore.map(p => ({ id: p.id, mileage: p.mileage, rv: p.rv })));

  await prisma.$transaction(async (tx) => {
    await tx.vehicleTrim.update({
      where: { id: xse.id },
      data: { msrpCents: NEW_MSRP_CENTS, rv36: NEW_RV },
    });
    await tx.bankProgram.updateMany({
      where: {
        batchId: activeBatch.id, programType: 'LEASE',
        make: 'Toyota', model: 'Camry', trim: 'XSE', year: 2026, term: TARGET_TERM,
      },
      data: { rv: NEW_RV },
    });
  });

  const xseAfter = await prisma.vehicleTrim.findUnique({ where: { id: xse.id } });
  const programsAfter = await prisma.bankProgram.findMany({
    where: {
      batchId: activeBatch.id, programType: 'LEASE',
      make: 'Toyota', model: 'Camry', trim: 'XSE', year: 2026, term: TARGET_TERM,
    },
  });

  console.log('\n=== AFTER ===');
  console.log('VehicleTrim XSE:', { msrpCents: xseAfter!.msrpCents, rv36: xseAfter!.rv36 });
  console.log(`BankProgram XSE LEASE term=${TARGET_TERM}:`, programsAfter.map(p => ({ id: p.id, mileage: p.mileage, rv: p.rv })));
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
