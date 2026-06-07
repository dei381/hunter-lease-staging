import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.oemIncentiveProgram.deleteMany({
    where: { name: { contains: 'Marketcheck Lease Cash' } }
  });
  console.log('Deleted marketcheck: ', result.count);

  const hma = await prisma.oemIncentiveProgram.findMany({
    where: { name: { contains: 'HMA Retail Bonus Cash' } }
  });
  
  let updatedHmaCount = 0;
  for (const h of hma) {
    let newName = h.name.replace(/\\/g, ''); // remove any slashes
    await prisma.oemIncentiveProgram.update({
      where: { id: h.id },
      data: {
        name: newName,
        type: 'OEM_CASH'
      }
    });
    updatedHmaCount++;
  }
  console.log('Updated HMA: ', updatedHmaCount);

  // Re-link incentives
  const incentives = await prisma.oemIncentiveProgram.findMany({
    where: { isActive: true, status: 'PUBLISHED' }
  });
  const formattedIncentives = incentives.map(inc => ({
    id: inc.id,
    name: inc.name,
    amount: inc.amountCents / 100,
    type: inc.type === 'OEM_CASH' ? 'manufacturer' : 'special',
    isDefault: inc.type === 'OEM_CASH',
    expiresAt: inc.effectiveTo ? inc.effectiveTo.toISOString() : undefined,
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
      const make = data.make || "";
      const model = data.model || "";
      const trim = data.trim || "";
      if (!make) continue;

      let matched = formattedIncentives.filter(inc => {
        if (inc.make === "ALL" || inc.make?.toLowerCase() === make.toLowerCase()) {
          if (!inc.model || inc.model === "ALL" || inc.model.toLowerCase() === model.toLowerCase() || new RegExp("\\b" + inc.model + "\\b", "i").test(model) || model.toLowerCase().includes(inc.model.toLowerCase()) || inc.model.toLowerCase().includes(model.toLowerCase())) {
            if (!inc.trim || inc.trim === "ALL" || inc.trim.toLowerCase() === trim.toLowerCase() || trim.toLowerCase().includes(inc.trim.toLowerCase().split(" ")[0]) || inc.trim.toLowerCase().includes(trim.toLowerCase().split(" ")[0])) {
              return true;
            }
          }
        }
        return false;
      });

      // Filter out duplicate generic ones taking the largest
      let finalIncentives: any[] = [];
      
      const genericIncs = matched.filter(i => i.isDefault);
      const specialIncs = matched.filter(i => !i.isDefault);

      if (genericIncs.length > 0) {
        // take largest generic
        genericIncs.sort((a,b) => b.amount - a.amount);
        finalIncentives.push(genericIncs[0]);
      }
      finalIncentives.push(...specialIncs);

      data.availableIncentives = finalIncentives;
      await prisma.dealRecord.update({
        where: { id: deal.id },
        data: { financialData: JSON.stringify(data) }
      });
      updatedCount++;
    } catch(e) { }
  }
  console.log("Updated deals", updatedCount);
}

main().catch(console.error).finally(()=>prisma.$disconnect());
