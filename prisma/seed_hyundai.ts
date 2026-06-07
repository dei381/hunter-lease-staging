import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to seed Hyundai Lease Programs...');

  // Ensure lender HMF exists
  let hmf = await prisma.lender.findUnique({
    where: { name: 'Hyundai Motor Finance' }
  });

  if (!hmf) {
    hmf = await prisma.lender.create({
      data: {
        name: 'Hyundai Motor Finance',
        isCaptive: true,
        lenderType: 'CAPTIVE',
        priority: 1
      }
    });
    console.log('Created Hyundai Motor Finance lender.');
  }

  // Ensure active batch
  let activeBatch = await prisma.programBatch.findFirst({
    where: { status: 'ACTIVE' }
  });

  if (!activeBatch) {
    activeBatch = await prisma.programBatch.create({
      data: { status: 'ACTIVE' }
    });
  }

  const csvPath = path.join(process.cwd(), 'src/data/hyundai_lease_programs.csv');
  if (!fs.existsSync(csvPath)) {
    console.error('File not found:', csvPath);
    process.exit(1);
  }

  const csvData = fs.readFileSync(csvPath, 'utf-8');
  
  // Parse CSV
  const parseResult = Papa.parse(csvData, {
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true
  });

  const rows = parseResult.data as any[];
  console.log(`Parsed ${rows.length} rows from CSV.`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const row of rows) {
    // Expected Columns: make,model,trim,year,msrp,selling_price,term,credit_tier,tier_range,
    // credit_score,band,residual_pct,residual_dollar,money_factor,apr,monthly_payment,base_monthly,tax_pct,
    // due_at_signing,cap_cost,mileage_adj,incentive_total,incentives,acquisition_fee,registration_fee,lender,
    // lender_code,deal_id,region,zip_code,effective_month,source_url

    const make = row.make;
    const model = row.model;
    const trim = row.trim;
    const year = Number(row.year);
    const term = Number(row.term);
    const residualPercentage = Number(row.residual_pct) / 100; // Convert 72.0 -> 0.72
    const buyRateMf = Number(row.money_factor);
    const creditTier = row.credit_tier; // e.g. "Super Elite"
    const rebateTotal = Number(row.incentive_total) || 0;
    
    // In our schema, we have LeaseProgram that has internalLenderTier
    if (!make || !model || !trim || !year || !term || isNaN(buyRateMf) || isNaN(residualPercentage)) {
      continue;
    }

    try {
      // Create or update LeaseProgram
      // Note: the CSV doesn't specify mileage, but usually these are 10k or 15k. Let's assume 10k standard for this matrix
      const mileage = 10000;

      const programData = {
        lenderId: hmf.id,
        make,
        model,
        trim,
        year,
        term,
        mileage,
        internalLenderTier: creditTier,
        buyRateMf,
        residualPercentage,
        isActive: true,
        status: 'PUBLISHED'
      };

      const existingLease = await prisma.leaseProgram.findFirst({
        where: {
          lenderId: hmf.id,
          make,
          model,
          trim,
          year,
          term,
          mileage,
          internalLenderTier: creditTier
        }
      });

      if (existingLease) {
        await prisma.leaseProgram.update({
          where: { id: existingLease.id },
          data: programData
        });
        updatedCount++;
      } else {
        await prisma.leaseProgram.create({
          data: programData
        });
        createdCount++;
      }

      // We also need to map the OEM Incentives from this row
      if (rebateTotal > 0 && row.incentives) {
        // Simple distinct incentive creation per trim context just to have them
        const seedKey = `HMF-${make}-${model}-${trim}-${year}-${row.incentives}`;
        const existingInc = await prisma.oemIncentiveProgram.findUnique({
          where: { seedKey }
        });
        if (!existingInc) {
          await prisma.oemIncentiveProgram.create({
             data: {
               seedKey,
               name: row.incentives,
               amountCents: rebateTotal * 100,
               type: 'REBATE',
               dealApplicability: 'LEASE',
               isTaxableCa: true, 
               make,
               model,
               trim,
               isActive: true,
               status: 'PUBLISHED'
             }
          });
        }
      }

    } catch (e) {
      console.warn('Error processing row for', make, model, trim, e);
    }
  }

  console.log(`Finished processing Hyundai. Created: ${createdCount}, Updated: ${updatedCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
