import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Toyota bZ4X Deal & Programs...');

  // 1. Create or Find Bank: Toyota Financial Services
  const tmcc = await prisma.lender.upsert({
    where: { name: 'Toyota Financial Services' },
    update: {},
    create: {
      name: 'Toyota Financial Services',
      isCaptive: true,
      lenderType: 'CAPTIVE',
      priority: 100,
    }
  });

  // 2. Add Tier Mappings (Assume T1 = 730+)
  for (const tier of ['t1', 't2', 't3', 't4']) {
    await prisma.lenderTierMapping.upsert({
      where: { lenderId_uxTier: { lenderId: tmcc.id, uxTier: tier } },
      update: {},
      create: {
        lenderId: tmcc.id,
        uxTier: tier,
        internalLenderTier: tier === 't1' ? 'Tier 1' : `Tier ${tier.slice(1)}`,
        mfMarkup: 0.00040,
        aprMarkup: 1.0,
      }
    });
  }

  // 3. Add Program Availability and Fee Policies
  await prisma.lenderProgramAvailability.upsert({
    where: { lenderId_make_dealApplicability: { lenderId: tmcc.id, make: 'Toyota', dealApplicability: 'ALL' } },
    update: {},
    create: { lenderId: tmcc.id, make: 'Toyota', dealApplicability: 'ALL' }
  });
  
  await prisma.lenderFeePolicy.upsert({
    where: { lenderId_quoteType: { lenderId: tmcc.id, quoteType: 'LEASE' } },
    update: { acquisitionFeeCents: 65000 },
    create: { lenderId: tmcc.id, quoteType: 'LEASE', acquisitionFeeCents: 65000, docFeeLimitCents: 8500, maxLtvPercentage: 110 }
  });

  // 4. Create Programs for bZ4X
  const make = 'Toyota';
  const model = 'bZ4X';
  const trim = 'Base'; 
  const year = 2026;

  // Toyota Lease (36m)
  await prisma.leaseProgram.deleteMany({
    where: { lenderId: tmcc.id, make, model, term: 36, mileage: 10000 }
  });
  await prisma.leaseProgram.create({
    data: {
      lenderId: tmcc.id,
      make, model, trim: 'ALL', year,
      term: 36, mileage: 10000,
      internalLenderTier: 'Tier 1',
      buyRateMf: 0.00001,
      residualPercentage: 42, // 42%
      status: 'PUBLISHED'
    }
  });

  // Toyota Finance (72m)
  await prisma.financeProgram.deleteMany({
    where: { lenderId: tmcc.id, make, model, term: 72 }
  });
  await prisma.financeProgram.create({
    data: {
      lenderId: tmcc.id,
      make, model, trim: 'ALL', year,
      term: 72,
      internalLenderTier: 'Tier 1',
      buyRateApr: 0.00, // 0%
      status: 'PUBLISHED'
    }
  });

  // 5. Create Deal Record
  const msrp = 37599;
  const sellingPrice = 33833;
  const dealerDiscount = msrp - sellingPrice; // 3766
  
  const financialData = {
    make, model, trim: 'Base', year,
    msrp: msrp,
    dealerDiscount: dealerDiscount,
    dealerDiscountCents: dealerDiscount * 100,
    term: 36,
    mileage: 10000,
    moneyFactor: 0.00001,
    residualValue: 0.42,
    apr: 0.00, // Loan
    lenderId: tmcc.id,
    downPayment: 3000,
    taxMonthly: 0.0975, // 9.75% tax rate
    monthlyPayment: 331.49, // Target Lease Payment
    financeMonthlyPayment: 403.65, // Target Finance Payment
    totalRebate: 7000,
    financeRebate: 6000
  };

  const dbFinancialData = {
    make, model, trim: 'Base', year,
    msrp: { value: msrp, provenance_status: 'user_provided' },
    salePrice: { value: sellingPrice, provenance_status: 'user_provided' },
    dealerDiscount: { value: dealerDiscount, provenance_status: 'user_provided' },
    residualValue: { value: 0.42, provenance_status: 'matched_from_verified_program' },
    moneyFactor: { value: 0.00001, provenance_status: 'matched_from_verified_program' },
    baseAPR: { value: 0.00, provenance_status: 'matched_from_verified_program' },
    term: { value: 36, provenance_status: 'user_provided' },
    mileage: { value: 10000, provenance_status: 'user_provided' },
    monthlyPayment: { value: 331.49, provenance_status: 'user_provided' },
    financePayment: { value: 403.65, provenance_status: 'user_provided' },
    rebates: { value: 7000, provenance_status: 'user_provided' },      // Lease Rebate
    financeRebates: { value: 6000, provenance_status: 'user_provided' }, // Finance Rebate
    acquisitionFee: { value: 650, provenance_status: 'estimated_from_rule' },
    docFee: { value: 85, provenance_status: 'estimated_from_rule' },
    dmvFee: { value: 400, provenance_status: 'estimated_from_rule' },
    taxMonthly: { value: 0.0975, provenance_status: 'user_provided' }
  };

  const ingestionId = 'BZ4X-' + Date.now();
  await prisma.dealRecord.create({
    data: {
      type: 'v2',
      ingestionId,
      publishStatus: 'PUBLISHED',
      reviewStatus: 'APPROVED',
      lenderId: tmcc.id,
      financialData: JSON.stringify(dbFinancialData),
      payload: JSON.stringify(financialData),
      isPinned: true
    }
  });

  console.log('Seed completed successfully.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
