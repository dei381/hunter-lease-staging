import db from "./server/lib/db";

async function check() {
  const record = await db.siteSettings.findUnique({ where: { id: 'car_db' } });
  console.log("CAR_DB:", JSON.stringify(record ? JSON.parse(record.data) : {}, null, 2));

  const deals = await db.dealRecord.findMany({ take: 5 });
  console.log("\nDEALS (first 5):", JSON.stringify(deals.map(d => ({
    id: d.id,
    financialData: JSON.parse(d.financialData || '{}')
  })), null, 2));
}

check();
