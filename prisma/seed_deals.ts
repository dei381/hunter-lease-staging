import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DealRecords and QuoteSnapshots...');

  // 0. Seed CAR_DB and CAR_PHOTOS if missing
  const carDb = {
    makes: [
      {
        id: 'toyota',
        name: 'Toyota',
        models: [
          {
            id: 'camry',
            name: 'Camry',
            class: 'Sedan',
            trims: [
              { name: 'LE', feat: 'FWD · Safety Suite · Touchscreen' }
            ]
          }
        ]
      }
    ]
  };

  const carPhotos = [
    {
      id: 'camry-photo',
      makeId: 'toyota',
      modelId: 'camry',
      isDefault: true,
      imageUrl: 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?auto=format&fit=crop&q=80&w=800'
    }
  ];

  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify(carDb) },
    create: { id: 'car_db', data: JSON.stringify(carDb) }
  });

  await prisma.siteSettings.upsert({
    where: { id: 'car_photos' },
    update: { data: JSON.stringify(carPhotos) },
    create: { id: 'car_photos', data: JSON.stringify(carPhotos) }
  });

  const vehicle = await prisma.vehicleCache.findUnique({ where: { id: 'camry-2025' } });
  if (!vehicle) {
    console.error('Vehicle camry-2025 not found. Run seed.ts first.');
    return;
  }

  const lender = await prisma.lender.findFirst({ where: { name: 'Toyota Financial Services' } });
  if (!lender) {
    console.error('Lender not found. Run seed.ts first.');
    return;
  }

  // 1. Create a DealRecord
  const financialData = {
    type: 'lease',
    make: 'Toyota',
    model: 'Camry',
    trim: 'LE',
    year: 2024,
    msrp: 28000,
    savings: 1500,
    monthlyPayment: 349,
    term: 36,
    down: 3000,
    moneyFactor: 0.0015,
    residualValue: 0.58,
    region: 'California',
    dealer: 'Toyota of Hollywood',
    hot: true
  };

  await prisma.dealRecord.upsert({
    where: { ingestionId: 'demo-camry-lease' },
    update: {},
    create: {
      ingestionId: 'demo-camry-lease',
      type: 'lease',
      publishStatus: 'PUBLISHED',
      reviewStatus: 'APPROVED',
      financialData: JSON.stringify(financialData),
      isFirstTimeBuyerEligible: true,
      lenderId: lender.id
    }
  });

  // 2. Create a QuoteSnapshot for the catalog
  await prisma.quoteSnapshot.create({
    data: {
      vehicleId: vehicle.id,
      surface: 'CATALOG',
      quoteType: 'LEASE',
      quoteStatus: 'PROGRAM_BACKED',
      confidenceLevel: 'HIGH',
      isDefaultCatalogScenario: true,
      monthlyPaymentCents: 34900,
      effectiveDasOrDownCents: 300000,
      totalSavingsCents: 150000,
      lenderId: lender.id,
      auditPayload: JSON.stringify({ note: 'Seed data' })
    }
  });

  console.log('Seed complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
