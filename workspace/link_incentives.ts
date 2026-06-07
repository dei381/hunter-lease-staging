import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting to link incentives...');
  const incentives = await prisma.oemIncentiveProgram.findMany({
    where: { isActive: true, status: 'PUBLISHED' }
  });
  console.log(`Found ${incentives.length} active incentives.`);

  const formattedIncentives = incentives.map(inc => ({
    id: inc.id,
    name: inc.name,
    amount: inc.amountCents / 100,
    type: inc.type === 'OEM_CASH' ? 'manufacturer' : 'special',
    isDefault: inc.type === 'OEM_CASH',
    expiresAt: inc.effectiveTo ? inc.effectiveTo.toISOString() : undefined,
    stackable: inc.stackable,
    isTaxableCa: inc.isTaxableCa,
    verifiedByAdmin: inc.verifiedByAdmin,
    dbType: inc.type,
    make: inc.make,
    model: inc.model,
    trim: inc.trim
  }));

  const deals = await prisma.dealRecord.findMany();
  let updatedCount = 0;

  for (const deal of deals) {
    if (!deal.financialData) continue;
    try {
      const data = JSON.parse(deal.financialData);
      const make = data.make || '';
      const model = data.model || '';
      const trim = data.trim || '';

      if (!make) continue;

      const matchedIncentives = formattedIncentives.filter(inc => {
        if (inc.make === 'ALL' || inc.make?.toLowerCase() === make.toLowerCase()) {
          if (!inc.model || inc.model === 'ALL' || inc.model.toLowerCase() === model.toLowerCase() || new RegExp(`\\b${inc.model}\\b`, 'i').test(model)) {
            if (!inc.trim || inc.trim === 'ALL' || inc.trim.toLowerCase() === trim.toLowerCase() || new RegExp(`\\b${inc.trim}\\b`, 'i').test(trim)) {
              return true;
            }
          }
        }
        return false;
      });

      if (matchedIncentives.length > 0) {
        const existing = data.availableIncentives || [];
        const merged = [...existing];
        let hasChanges = false;
        
        for (const inc of matchedIncentives) {
          if (!merged.find((e: any) => e.name === inc.name)) {
            merged.push(inc);
            hasChanges = true;
          }
        }

        if (hasChanges) {
          data.availableIncentives = merged;
          await prisma.dealRecord.update({
            where: { id: deal.id },
            data: { financialData: JSON.stringify(data) }
          });
          updatedCount++;
        }
      }
    } catch(e) { }
  }
  console.log(`Updated ${updatedCount} deals.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
