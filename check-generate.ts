import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const deals = await prisma.dealRecord.findMany({
    where: { publishStatus: 'PUBLISHED' }
  });
  console.log("Total published deals:", deals.length);

  const scoredDeals = deals.map(deal => {
    try {
      const payload = JSON.parse(deal.financialData);
      const msrp = payload.msrp?.value || 0;
      const sellingPrice = payload.salePrice?.value || msrp;
      const rebates = (payload.manufacturerRebate?.value || 0) + (payload.rebates?.value || 0);
      const hunterDiscount = payload.hunterDiscount?.value || 0;
      const dealerDiscount = payload.dealerDiscount || 0;
      
      const totalDiscount = (msrp - sellingPrice) + rebates + hunterDiscount + dealerDiscount;
      const discountPercent = msrp > 0 ? (totalDiscount / msrp) * 100 : 0;
      
      return { id: deal.id, make: payload.make, model: payload.model, discountPercent, totalDiscount, msrp, sellingPrice, rebates, hunterDiscount, dealerDiscount };
    } catch (e) {
      return { id: deal.id, discountPercent: 0, totalDiscount: 0 };
    }
  }).sort((a, b) => b.discountPercent - a.discountPercent);

  console.log("Top 5 deals (even if 0 discount):", scoredDeals.slice(0, 5));

  for (const deal of scoredDeals.slice(0, 5)) {
    const existing = await prisma.promoAIPost.findFirst({
      where: { dealId: deal.id }
    });
    console.log(`Deal ${deal.id} (${deal.make} ${deal.model}): existing post?`, !!existing);
  }
}

check().catch(console.error).finally(() => prisma.$disconnect());
