import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
  const lender = await prisma.lender.findFirst({
    where: { name: { contains: 'Toyota Financial', mode: 'insensitive' } }
  });

  if (!lender) {
    console.error("Lender not found");
    return;
  }

  const activeBatch = await prisma.programBatch.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!activeBatch) {
    console.error("No active batch");
    return;
  }

  // Create or Update LeaseProgram
  await prisma.leaseProgram.upsert({
    where: {
      lenderId_make_model_trim_year_term_mileage_internalLenderTier: {
        lenderId: lender.id,
        make: "Toyota",
        model: "Sequoia",
        trim: "Platinum 4WD (Natl)",
        year: 2026,
        term: 48,
        mileage: 10000,
        internalLenderTier: "Tier 1"
      }
    },
    create: {
      lenderId: lender.id,
      make: "Toyota",
      model: "Sequoia",
      trim: "Platinum 4WD (Natl)",
      year: 2026,
      term: 48,
      mileage: 10000,
      internalLenderTier: "Tier 1",
      buyRateMf: 0.0031,
      residualPercentage: 75,
      isActive: true,
      status: "PUBLISHED"
    },
    update: {
      buyRateMf: 0.0031,
      residualPercentage: 75
    }
  });

  // Also BankProgram to be safe, maybe deleting first
  await prisma.bankProgram.deleteMany({
    where: {
      make: "Toyota",
      model: "Sequoia",
      term: 48
    }
  });

  await prisma.bankProgram.create({
    data: {
      batchId: activeBatch.id,
      lenderId: lender.id,
      programType: "LEASE",
      make: "Toyota",
      model: "Sequoia",
      trim: "Platinum 4WD (Natl)",
      year: 2026,
      term: 48,
      mileage: 10000,
      rv: 0.75,
      mf: 0.0031,
      apr: 7.44
    }
  });

  console.log("Sequoia inserted!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
