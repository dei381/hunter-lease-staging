import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  const deals = [
    {
      ingestionId: `SEED-BMW-${Date.now()}`,
      financialData: JSON.stringify({ make: 'BMW', model: '3 Series', year: 2024, trim: '330i', msrp: 45000, calcType: 'lease', calcPayment: 649, calcDown: 0, tier: 'Tier 1', mf: 0.00125, rv36: 0.55, term: 36, mileage: 10000, monthlyPayment: { value: 649 } }),
      programKeys: '{}',
      eligibility: JSON.stringify({ is_publishable: true, blocking_reasons: [] }),
      reviewStatus: 'APPROVED',
      publishStatus: 'PUBLISHED',
      isFirstTimeBuyerEligible: true,
      isSoldOut: false,
      isPinned: true,
    },
    {
      ingestionId: `SEED-MB-${Date.now() + 1}`,
      financialData: JSON.stringify({ make: 'Mercedes-Benz', model: 'C-Class', year: 2024, trim: 'C300', msrp: 46000, calcType: 'lease', calcPayment: 699, calcDown: 0, tier: 'Tier 1', mf: 0.00130, rv36: 0.54, term: 36, mileage: 10000, monthlyPayment: { value: 699 } }),
      programKeys: '{}',
      eligibility: JSON.stringify({ is_publishable: true, blocking_reasons: [] }),
      reviewStatus: 'APPROVED',
      publishStatus: 'PUBLISHED',
      isFirstTimeBuyerEligible: true,
      isSoldOut: false,
      isPinned: false,
    },
    {
      ingestionId: `SEED-AUDI-${Date.now() + 2}`,
      financialData: JSON.stringify({ make: 'Audi', model: 'A4', year: 2024, trim: 'Premium Plus', msrp: 45000, calcType: 'finance', calcPayment: 750, calcDown: 5000, tier: 'Tier 1', baseAPR: 4.9, term: 60, monthlyPayment: { value: 750 } }),
      programKeys: '{}',
      eligibility: JSON.stringify({ is_publishable: true, blocking_reasons: [] }),
      reviewStatus: 'NEEDS_REVIEW',
      publishStatus: 'DRAFT',
      isFirstTimeBuyerEligible: true,
      isSoldOut: false,
      isPinned: false,
    },
  ];
  for (const d of deals) {
    await p.dealRecord.create({ data: d });
  }
  console.log('Deals seeded OK');
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
