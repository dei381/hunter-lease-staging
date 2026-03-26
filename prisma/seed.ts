import { PrismaClient } from '@prisma/client';

// Enums as constants for seed script
const QuoteType = { LEASE: 'LEASE', FINANCE: 'FINANCE' };
const DealApplicability = { LEASE: 'LEASE', FINANCE: 'FINANCE', BOTH: 'BOTH' };
const UxTier = { TIER_1_PLUS: 'TIER_1_PLUS', TIER_1: 'TIER_1', TIER_2: 'TIER_2', TIER_3: 'TIER_3', TIER_4: 'TIER_4', TIER_5: 'TIER_5' };
const RollabilityTierScope = { ALL: 'ALL' };
const IncentiveType = { OEM_CASH: 'OEM_CASH' };
const DiscountType = { FLAT_AMOUNT: 'FLAT_AMOUNT', PERCENTAGE_MSRP: 'PERCENTAGE_MSRP' };
const ScopeLevel = { GLOBAL: 'GLOBAL' };

const prisma = new PrismaClient();

async function main() {
  console.log('Starting Phase 1 MVP Database Seed...');

  // ==========================================
  // 1. Global Configs
  // ==========================================
  console.log('Seeding GlobalEstimationPolicy...');
  await prisma.globalEstimationPolicy.upsert({
    where: { id: 'GLOBAL' },
    update: {},
    create: {
      id: 'GLOBAL',
      fallbackSalesTaxRate: 0.0950,
      fallbackDmvFeeCents: 60000, // $600
      fallbackDocFeeCents: 8500,  // $85
    },
  });

  console.log('Seeding CatalogDefaultScenario...');
  await prisma.catalogDefaultScenario.upsert({
    where: { id: 'DEFAULT_LEASE' },
    update: {},
    create: {
      id: 'DEFAULT_LEASE',
      quoteType: QuoteType.LEASE,
      term: 36,
      mileage: 10000,
      dueAtSigningCents: 300000, // $3,000
      uxTier: UxTier.TIER_1_PLUS,
      assumeFirstTimeBuyer: false,
    },
  });

  await prisma.catalogDefaultScenario.upsert({
    where: { id: 'DEFAULT_FINANCE' },
    update: {},
    create: {
      id: 'DEFAULT_FINANCE',
      quoteType: QuoteType.FINANCE,
      term: 60,
      downPaymentCents: 500000, // $5,000
      uxTier: UxTier.TIER_1_PLUS,
      assumeFirstTimeBuyer: false,
    },
  });

  // ==========================================
  // 2. Regional Data
  // ==========================================
  console.log('Seeding RegionalTaxFeeCache...');
  await prisma.regionalTaxFeeCache.upsert({
    where: { zipCode: '90210' },
    update: {},
    create: {
      zipCode: '90210',
      state: 'CA',
      county: 'Los Angeles',
      salesTaxRate: 0.0950,
      estimatedDmvFeeCents: 60000,
    },
  });

  // ==========================================
  // 3. Vehicles
  // ==========================================
  console.log('Seeding VehicleCache...');
  const vehicle = await prisma.vehicleCache.upsert({
    where: { id: 'camry-2025' },
    update: {},
    create: {
      id: 'camry-2025',
      vin: 'DEMO_VIN_CAMRY_001',
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE',
      year: 2024,
      msrpCents: 2800000, // $28,000
      bodyStyle: 'Sedan',
      features: JSON.stringify({ color: 'Silver', engine: '4-Cyl' }),
      isActive: true,
    },
  });

  // ==========================================
  // 4. Lender Core
  // ==========================================
  console.log('Seeding Lender...');
  const lender = await prisma.lender.upsert({
    where: { name: 'Toyota Financial Services' },
    update: {},
    create: {
      name: 'Toyota Financial Services',
      isCaptive: true,
      priority: 1,
      isActive: true,
    },
  });

  // ==========================================
  // 5. Lender Rules
  // ==========================================
  console.log('Seeding LenderProgramAvailability...');
  await prisma.lenderProgramAvailability.upsert({
    where: {
      lenderId_make_dealApplicability: {
        lenderId: lender.id,
        make: 'Toyota',
        dealApplicability: DealApplicability.BOTH,
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      make: 'Toyota',
      dealApplicability: DealApplicability.BOTH,
    },
  });

  console.log('Seeding LenderEligibilityRule...');
  await prisma.lenderEligibilityRule.upsert({
    where: {
      lenderId_make_model_dealApplicability: {
        lenderId: lender.id,
        make: 'Toyota',
        model: 'ALL',
        dealApplicability: DealApplicability.BOTH,
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      make: 'Toyota',
      model: 'ALL',
      dealApplicability: DealApplicability.BOTH,
      allowFirstTimeBuyer: true,
      allowWithCoSigner: true,
      requiresEstablishedCredit: true,
      minUxTierRequired: UxTier.TIER_3,
    },
  });

  console.log('Seeding LenderTierMapping...');
  const tiers = [
    { uxTier: UxTier.TIER_1_PLUS, internal: 'Tier 1+', mfMarkup: 0.00000, aprMarkup: 0.00 },
    { uxTier: UxTier.TIER_1, internal: 'Tier 1', mfMarkup: 0.00010, aprMarkup: 0.50 },
    { uxTier: UxTier.TIER_2, internal: 'Tier 2', mfMarkup: 0.00020, aprMarkup: 1.00 },
    { uxTier: UxTier.TIER_3, internal: 'Tier 3', mfMarkup: 0.00040, aprMarkup: 2.00 },
    { uxTier: UxTier.TIER_4, internal: 'Tier 4', mfMarkup: 0.00080, aprMarkup: 4.00 },
    { uxTier: UxTier.TIER_5, internal: 'Tier 5', mfMarkup: 0.00120, aprMarkup: 6.00 },
  ];

  for (const t of tiers) {
    await prisma.lenderTierMapping.upsert({
      where: {
        lenderId_uxTier: {
          lenderId: lender.id,
          uxTier: t.uxTier,
        },
      },
      update: {},
      create: {
        lenderId: lender.id,
        uxTier: t.uxTier,
        internalLenderTier: t.internal,
        mfMarkup: t.mfMarkup,
        aprMarkup: t.aprMarkup,
      },
    });
  }

  console.log('Seeding LenderFeePolicy...');
  const leaseFeePolicy = await prisma.lenderFeePolicy.upsert({
    where: {
      lenderId_quoteType: {
        lenderId: lender.id,
        quoteType: 'LEASE',
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      quoteType: 'LEASE',
      acquisitionFeeCents: 65000, // $650
      docFeeLimitCents: 8500,     // $85
      maxLtvPercentage: 110.00,
    },
  });

  const financeFeePolicy = await prisma.lenderFeePolicy.upsert({
    where: {
      lenderId_quoteType: {
        lenderId: lender.id,
        quoteType: 'FINANCE',
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      quoteType: 'FINANCE',
      acquisitionFeeCents: 0,
      docFeeLimitCents: 8500,
      maxLtvPercentage: 120.00,
    },
  });

  // ==========================================
  // 6. Fee Rules
  // ==========================================
  console.log('Seeding FeeRollabilityRule...');
  await prisma.feeRollabilityRule.upsert({
    where: {
      lenderFeePolicyId_tierScope: {
        lenderFeePolicyId: leaseFeePolicy.id,
        tierScope: RollabilityTierScope.ALL,
      },
    },
    update: {},
    create: {
      lenderFeePolicyId: leaseFeePolicy.id,
      tierScope: RollabilityTierScope.ALL,
      canRollAcqFee: true,
      canRollDocFee: false,
      canRollTaxes: false,
    },
  });

  await prisma.feeRollabilityRule.upsert({
    where: {
      lenderFeePolicyId_tierScope: {
        lenderFeePolicyId: financeFeePolicy.id,
        tierScope: RollabilityTierScope.ALL,
      },
    },
    update: {},
    create: {
      lenderFeePolicyId: financeFeePolicy.id,
      tierScope: RollabilityTierScope.ALL,
      canRollAcqFee: true,
      canRollDocFee: true,
      canRollTaxes: true,
    },
  });

  // ==========================================
  // 7. Pricing Programs
  // ==========================================
  console.log('Seeding LeaseProgram...');
  await prisma.leaseProgram.upsert({
    where: {
      lenderId_make_model_trim_year_term_mileage_internalLenderTier: {
        lenderId: lender.id,
        make: 'Toyota',
        model: 'Camry',
        trim: 'LE',
        year: 2024,
        term: 36,
        mileage: 10000,
        internalLenderTier: 'Tier 1+',
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE',
      year: 2024,
      term: 36,
      mileage: 10000,
      internalLenderTier: 'Tier 1+',
      buyRateMf: 0.00150,
      residualPercentage: 58.00,
      isActive: true,
    },
  });

  console.log('Seeding FinanceProgram...');
  await prisma.financeProgram.upsert({
    where: {
      lenderId_make_model_trim_year_term_internalLenderTier: {
        lenderId: lender.id,
        make: 'Toyota',
        model: 'Camry',
        trim: 'LE',
        year: 2024,
        term: 60,
        internalLenderTier: 'Tier 1+',
      },
    },
    update: {},
    create: {
      lenderId: lender.id,
      make: 'Toyota',
      model: 'Camry',
      trim: 'LE',
      year: 2024,
      term: 60,
      internalLenderTier: 'Tier 1+',
      buyRateApr: 4.99,
      isActive: true,
    },
  });

  // ==========================================
  // 8. Incentives (Idempotent via seedKey)
  // ==========================================
  console.log('Seeding OemIncentiveProgram...');
  await prisma.oemIncentiveProgram.upsert({
    where: { seedKey: 'DEMO_TOYOTA_LEASE_CASH_001' },
    update: {
      amountCents: 50000, // $500
      isActive: true,
      name: '[DEMO] Toyota Lease Cash',
    },
    create: {
      seedKey: 'DEMO_TOYOTA_LEASE_CASH_001',
      name: '[DEMO] Toyota Lease Cash',
      amountCents: 50000, // $500
      type: IncentiveType.OEM_CASH,
      dealApplicability: DealApplicability.LEASE,
      isTaxableCa: true,
      exclusiveGroupId: 'DEMO_TOYOTA_CASH_GROUP',
      make: 'Toyota',
      model: 'Camry',
      isActive: true,
    },
  });

  console.log('Seeding HunterDiscountPolicy...');
  await prisma.hunterDiscountPolicy.upsert({
    where: { seedKey: 'DEMO_HUNTER_LAUNCH_DISCOUNT_001' },
    update: {
      flatAmountCents: 100000, // $1,000
      isActive: true,
      name: '[DEMO] Hunter Launch Discount',
    },
    create: {
      seedKey: 'DEMO_HUNTER_LAUNCH_DISCOUNT_001',
      name: '[DEMO] Hunter Launch Discount',
      discountType: DiscountType.FLAT_AMOUNT,
      flatAmountCents: 100000, // $1,000
      scopeLevel: ScopeLevel.GLOBAL,
      isActive: true,
    },
  });

  console.log('Phase 1 MVP Database Seed Complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
