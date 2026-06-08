import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const prisma = new PrismaClient();

async function importV2() {
  const filePath = path.join(process.cwd(), 'data2.csv');
  if (!fs.existsSync(filePath)) {
     console.log('No data2.csv found.');
     return;
  }
  const csvText = fs.readFileSync(filePath, 'utf8');
  
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: true,
  });

  const batch = await prisma.programBatch.create({
    data: {
      status: 'ACTIVE',
      isValid: true,
    }
  });

  for (const row of parsed.data as any[]) {
    const make = row.make;
    const model = row.model;
    const trim = row.trim;
    let year = Number(row.year);
    if (!year || isNaN(year)) year = 2026;
    const term = parseInt(row.term);
    
    if (!make || !model || !trim || !term) continue;

    const lender = await prisma.lender.upsert({
      where: { name: row.lender || 'Standard Lender' },
      update: {},
      create: { name: row.lender || 'Standard Lender', isCaptive: true, lenderType: 'CAPTIVE', priority: 10 }
    });

    const rv = row.residual_pct ? (parseFloat(row.residual_pct) / 100) : 0;
    const mf = row.money_factor ? parseFloat(row.money_factor) : 0;
    const apr = row.apr ? parseFloat(row.apr) : 0;

    // Lease
    if (mf > 0) {
      await prisma.leaseProgram.upsert({
         where: { lenderId_make_model_trim_year_term_mileage_internalLenderTier: {
             lenderId: lender.id, make, model, trim, year, term, mileage: 10000, internalLenderTier: 'Super Elite'
         }},
         update: { buyRateMf: mf, residualPercentage: rv * 100 },
         create: {
             lenderId: lender.id, make, model, trim, year, term, mileage: 10000, internalLenderTier: 'Super Elite',
             buyRateMf: mf, residualPercentage: rv * 100, isActive: true, status: 'PUBLISHED'
         }
      });
      // Tier 1 fallback map for frontend compat
      await prisma.leaseProgram.upsert({
         where: { lenderId_make_model_trim_year_term_mileage_internalLenderTier: {
             lenderId: lender.id, make, model, trim, year, term, mileage: 10000, internalLenderTier: 'Tier 1'
         }},
         update: { buyRateMf: mf, residualPercentage: rv * 100 },
         create: {
             lenderId: lender.id, make, model, trim, year, term, mileage: 10000, internalLenderTier: 'Tier 1',
             buyRateMf: mf, residualPercentage: rv * 100, isActive: true, status: 'PUBLISHED'
         }
      });
    }

    // Finance - Use the APR logic
    if (apr > 0) {
      await prisma.financeProgram.upsert({
         where: { lenderId_make_model_trim_year_term_internalLenderTier: {
             lenderId: lender.id, make, model, trim, year, term, internalLenderTier: 'Super Elite'
         }},
         update: { buyRateApr: apr },
         create: {
             lenderId: lender.id, make, model, trim, year, term, internalLenderTier: 'Super Elite',
             buyRateApr: apr, isActive: true, status: 'PUBLISHED'
         }
      });
      await prisma.financeProgram.upsert({
         where: { lenderId_make_model_trim_year_term_internalLenderTier: {
             lenderId: lender.id, make, model, trim, year, term, internalLenderTier: 'Tier 1'
         }},
         update: { buyRateApr: apr },
         create: {
             lenderId: lender.id, make, model, trim, year, term, internalLenderTier: 'Tier 1',
             buyRateApr: apr, isActive: true, status: 'PUBLISHED'
         }
      });
    }

    // Incentives
    if (row.incentives) {
        const amountCents = (parseFloat(row.incentive_total) || 0) * 100;
        const name = String(row.incentives).replace(/"/g, '').trim();

        if (amountCents > 0) {
            const seedKey = `V2-${make}-${model}-${trim}-${term}-${name}`;
            await prisma.oemIncentiveProgram.upsert({
               where: { seedKey },
               update: {
                  amountCents,
                  eligibilityRules: { terms: [term] }
               },
               create: {
                  seedKey,
                  name,
                  amountCents,
                  type: name.toLowerCase().includes('cash') || name.toLowerCase().includes('rebate') ? 'OEM_CASH' : 'SPECIAL',
                  dealApplicability: 'ALL',
                  make,
                  model,
                  trim,
                  eligibilityRules: { terms: [term] },
                  isActive: true,
                  status: 'PUBLISHED'
               }
            });
        }
    }
  }

  console.log('Database updated with Term-specific programs and incentives!');
}

importV2()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
