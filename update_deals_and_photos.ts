import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Updating car_photos and generating DealRecords from car_db...');

  const carDbRecord = await prisma.siteSettings.findUnique({ where: { id: 'car_db' } });
  if (!carDbRecord) {
    console.error('car_db not found.');
    return;
  }

  const carDb = JSON.parse(carDbRecord.data);
  const photos: any[] = [];
  const deals: any[] = [];

  const allLenders = await prisma.lender.findMany();
  const getLenderId = (makeName: string) => {
    const lender = allLenders.find(l => l.name.toLowerCase().includes(makeName.toLowerCase()));
    return lender ? lender.id : null;
  };

  // 1. Collect photos and clean up trims
  carDb.makes.forEach((make: any) => {
    const lenderId = getLenderId(make.name);
    const makeId = make.name.toLowerCase().replace(/\s+/g, '-');
    make.models.forEach((model: any) => {
      const modelId = model.name.toLowerCase().replace(/\s+/g, '-');
      // Add photo
      if (model.imageUrl) {
        photos.push({
          id: `${makeId}-${modelId}-photo`,
          makeId: makeId,
          modelId: modelId,
          isDefault: true,
          imageUrl: model.imageUrl
        });
      }

      // Filter out trims with 0 MSRP
      if (model.trims) {
        model.trims = model.trims.filter((t: any) => t.msrp > 0);
        
        // Generate a deal for each valid trim
        model.trims.forEach((trim: any) => {
          // Standard lease scenario: 36mo, 10k mi, $3k down
          const term = 36;
          const down = 3000;
          const msrp = Number(trim.msrp);
          const savings = Number(trim.leaseCash || 0);
          const capCost = msrp - savings - down + 500; // +500 for fees
          let residualValue = Number(trim.rv36 || 0.60);
          if (residualValue > 1) residualValue = residualValue / 100;
          const residual = msrp * residualValue;
          const mf = Number(trim.mf || 0.0025);
          
          const depreciation = (capCost - residual) / term;
          const rentCharge = (capCost + residual) * mf;
          const monthlyPayment = Math.round(depreciation + rentCharge);

          if (isNaN(monthlyPayment)) {
            console.warn(`NaN payment for ${make.name} ${model.name} ${trim.name}: msrp=${msrp}, savings=${savings}, rv=${residualValue}, mf=${mf}`);
            return;
          }

          const financialData = {
            type: 'lease',
            make: make.name,
            model: model.name,
            trim: trim.name,
            year: 2026,
            msrp: msrp,
            savings: savings,
            monthlyPayment: monthlyPayment,
            term: term,
            down: down,
            moneyFactor: mf,
            residualValue: residualValue,
            region: 'California',
            dealer: `${make.name} of Los Angeles`,
            hot: monthlyPayment < (msrp * 0.012) // If payment < 1.2% of MSRP, it's a hot deal
          };

          const year = 2026;
          const ingestionId = `sync-${makeId}-${modelId}-${year}-${trim.name.toLowerCase().replace(/\s+/g, '-')}`;
          
          deals.push({
            ingestionId: ingestionId,
            type: 'lease',
            publishStatus: 'PUBLISHED',
            reviewStatus: 'APPROVED',
            financialData: JSON.stringify(financialData),
            isFirstTimeBuyerEligible: true,
            lenderId: lenderId
          });
        });
      }
    });
  });

  // 2. Save updated car_db (cleaned trims)
  await prisma.siteSettings.update({
    where: { id: 'car_db' },
    data: { data: JSON.stringify(carDb) }
  });

  // 3. Save car_photos
  await prisma.siteSettings.upsert({
    where: { id: 'car_photos' },
    update: { data: JSON.stringify(photos) },
    create: { id: 'car_photos', data: JSON.stringify(photos) }
  });

  // 4. Save DealRecords
  console.log(`Generating ${deals.length} DealRecords...`);
  
  // Clear old synced deals and seeded deals first to avoid duplicates or stale data
  await prisma.dealRecord.deleteMany({
    where: {
      NOT: {
        ingestionId: { startsWith: 'MANUAL-' }
      }
    }
  });

  for (const deal of deals) {
    await prisma.dealRecord.upsert({
      where: { ingestionId: deal.ingestionId },
      update: deal,
      create: deal
    });
  }

  console.log('Update complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
