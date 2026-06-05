import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Toyota Supra Deal & Programs...');

  // 1. Create or Find Banks
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

  const rize = await prisma.lender.upsert({
    where: { name: 'RIZE FCU' },
    update: {},
    create: {
      name: 'RIZE FCU',
      isCaptive: false,
      lenderType: 'CREDIT_UNION',
      priority: 80,
    }
  });

  // 2. Add Tier Mappings (Assume T1 = 730+)
  for (const lender of [tmcc, rize]) {
    for (const tier of ['t1', 't2', 't3', 't4']) {
      await prisma.lenderTierMapping.upsert({
        where: { lenderId_uxTier: { lenderId: lender.id, uxTier: tier } },
        update: {},
        create: {
          lenderId: lender.id,
          uxTier: tier,
          internalLenderTier: tier === 't1' ? 'Tier 1' : `Tier ${tier.slice(1)}`,
          mfMarkup: 0.00040,
          aprMarkup: 1.0,
        }
      });
    }
  }

  // 3. Add Program Availability and Fee Policies
  for (const lender of [tmcc, rize]) {
    await prisma.lenderProgramAvailability.upsert({
      where: { lenderId_make_dealApplicability: { lenderId: lender.id, make: 'Toyota', dealApplicability: 'ALL' } },
      update: {},
      create: { lenderId: lender.id, make: 'Toyota', dealApplicability: 'ALL' }
    });
    
    // Fee policies
    await prisma.lenderFeePolicy.upsert({
      where: { lenderId_quoteType: { lenderId: lender.id, quoteType: 'LEASE' } },
      update: { acquisitionFeeCents: 65000 },
      create: { lenderId: lender.id, quoteType: 'LEASE', acquisitionFeeCents: 65000, docFeeLimitCents: 8500, maxLtvPercentage: 110 }
    });
  }

  // 4. Create Programs for GR Supra
  const make = 'Toyota';
  const model = 'GR Supra';
  const trim = 'Base'; // Or 3.0 Premium based on MSRP $74,165. Let's use '3.0 Premium'
  const year = 2026;

  // TMCC Lease (36m, 39m)
  const tmccLeases = [
    { term: 36, mileage: 10000, mf: 0.0027, rv: 68 },
    { term: 39, mileage: 10000, mf: 0.0029, rv: 66 },
  ];
  for (const p of tmccLeases) {
    // Delete existing to overwrite
    await prisma.leaseProgram.deleteMany({
      where: { lenderId: tmcc.id, make, model, term: p.term, mileage: p.mileage }
    });
    await prisma.leaseProgram.create({
      data: {
        lenderId: tmcc.id,
        make, model, trim: 'ALL', year,
        term: p.term, mileage: p.mileage,
        internalLenderTier: 'Tier 1',
        buyRateMf: p.mf,
        residualPercentage: p.rv,
        status: 'PUBLISHED'
      }
    });
  }

  // RIZE FCU Lease (48m, 60m)
  const rizeLeases = [
    { term: 48, mileage: 10000, mf: 0.00233, rv: 57 },
    { term: 60, mileage: 10000, mf: 0.00233, rv: 45 },
  ];
  for (const p of rizeLeases) {
    await prisma.leaseProgram.deleteMany({
      where: { lenderId: rize.id, make, model, term: p.term, mileage: p.mileage }
    });
    await prisma.leaseProgram.create({
      data: {
        lenderId: rize.id,
        make, model, trim: 'ALL', year,
        term: p.term, mileage: p.mileage,
        internalLenderTier: 'Tier 1',
        buyRateMf: p.mf,
        residualPercentage: p.rv,
        status: 'PUBLISHED'
      }
    });
  }

  // TMCC Finance (72m)
  await prisma.financeProgram.deleteMany({
    where: { lenderId: tmcc.id, make, model, term: 72 }
  });
  await prisma.financeProgram.create({
    data: {
      lenderId: tmcc.id,
      make, model, trim: 'ALL', year,
      term: 72,
      internalLenderTier: 'Tier 1',
      buyRateApr: 5.99,
      status: 'PUBLISHED'
    }
  });

  // 5. Create Deal Record
  // Deal financialData JSON
  const dealerDiscount = -1000;
  const msrp = 74165;
  const financialData = {
    make, model, trim: '3.0 Premium', year,
    msrp: msrp, // note: the OfferBuilderModal uses numerical values when generating payload
    dealerDiscount: dealerDiscount,
    dealerDiscountCents: dealerDiscount * 100,
    term: 36,
    mileage: 10000,
    moneyFactor: 0.0027,
    residualValue: 0.68,
    apr: 5.99,
    lenderId: tmcc.id,
    downPayment: 3000,
    taxMonthly: 0.0975, // 9.75% tax rate
    monthlyPayment: 1135.57 // Reference target payment
  };

  const dbFinancialData = {
    make, model, trim: '3.0 Premium', year,
    msrp: { value: msrp, provenance_status: 'user_provided' },
    salePrice: { value: msrp - dealerDiscount, provenance_status: 'user_provided' },
    dealerDiscount: { value: dealerDiscount, provenance_status: 'user_provided' },
    residualValue: { value: 0.68, provenance_status: 'matched_from_verified_program' },
    moneyFactor: { value: 0.0027, provenance_status: 'matched_from_verified_program' },
    term: { value: 36, provenance_status: 'user_provided' },
    mileage: { value: 10000, provenance_status: 'user_provided' },
    monthlyPayment: { value: 1135.57, provenance_status: 'user_provided' },
    rebates: { value: 0, provenance_status: 'user_provided' },
    acquisitionFee: { value: 0, provenance_status: 'estimated_from_rule' },
    docFee: { value: 0, provenance_status: 'estimated_from_rule' },
    dmvFee: { value: 0, provenance_status: 'estimated_from_rule' },
    taxMonthly: { value: 0.0975, provenance_status: 'user_provided' }
  };

  const ingestionId = 'SUPRA-' + Date.now();
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
