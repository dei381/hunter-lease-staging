import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runTests() {
  const baseUrl = 'http://localhost:3000';

  console.log("--- TEST 0: Clear Database ---");
  await prisma.dealRecord.deleteMany({});
  await prisma.siteSettings.deleteMany({ where: { id: { in: ['car_db', 'car_photos'] } } });
  console.log("Database cleared.");

  console.log("\n--- TEST 1: GET /api/deals (Empty) ---");
  let res = await fetch(`${baseUrl}/api/deals`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 2: GET /api/cars (Empty/Default) ---");
  res = await fetch(`${baseUrl}/api/cars`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 3: GET /api/car-photos (Empty/Default) ---");
  res = await fetch(`${baseUrl}/api/car-photos`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 4: Seed DealRecord and CAR_DB directly via Prisma ---");
  await prisma.siteSettings.upsert({
    where: { id: 'car_db' },
    update: { data: JSON.stringify({ makes: [{ id: 'make1', name: 'Toyota' }] }) },
    create: { id: 'car_db', data: JSON.stringify({ makes: [{ id: 'make1', name: 'Toyota' }] }) }
  });
  
  await prisma.siteSettings.upsert({
    where: { id: 'car_photos' },
    update: { data: JSON.stringify([{ id: 'photo1', url: 'http://example.com/photo.jpg' }]) },
    create: { id: 'car_photos', data: JSON.stringify([{ id: 'photo1', url: 'http://example.com/photo.jpg' }]) }
  });

  await prisma.dealRecord.upsert({
    where: { ingestionId: 'test-ingestion-123' },
    update: {},
    create: {
      ingestionId: 'test-ingestion-123',
      reviewStatus: 'APPROVED',
      publishStatus: 'PUBLISHED',
      programKeys: JSON.stringify({ programId: 'test' }),
      eligibility: JSON.stringify({}),
      financialData: JSON.stringify({
        make: 'Toyota',
        model: 'Camry',
        year: 2024,
        trim: 'LE',
        payment: 0, // Set to 0 to trigger fallback recalculation
        dueAtSigning: 1000,
        msrp: 28000,
        sellingPrice: 27000,
        residualValue: 18000,
        moneyFactor: 0.0015,
        isNew: true
      })
    }
  });
  console.log("Seeded successfully.");

  console.log("\n--- TEST 5: GET /api/cars (Verify Persistence) ---");
  res = await fetch(`${baseUrl}/api/cars`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 6: GET /api/car-photos (Verify Persistence) ---");
  res = await fetch(`${baseUrl}/api/car-photos`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 7: GET /api/deals (With Data) ---");
  res = await fetch(`${baseUrl}/api/deals`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 8: PUT /api/cars (Persist to Postgres) ---");
  const newCarDb = { makes: [{ id: 'make2', name: 'Honda' }] };
  res = await fetch(`${baseUrl}/api/cars`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer 300595Azat!',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(newCarDb)
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 9: GET /api/cars (Verify PUT Persistence) ---");
  res = await fetch(`${baseUrl}/api/cars`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 10: PUT /api/admin/car-photos/:id/default (Persist to Postgres) ---");
  res = await fetch(`${baseUrl}/api/admin/car-photos/photo1/default`, {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer 300595Azat!'
    }
  });
  console.log("Status:", res.status);
  console.log("Body:", await res.text());

  console.log("\n--- TEST 11: GET /api/car-photos (Verify PUT Persistence) ---");
  res = await fetch(`${baseUrl}/api/car-photos`);
  console.log("Status:", res.status);
  console.log("Body:", await res.text());
}

runTests()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
