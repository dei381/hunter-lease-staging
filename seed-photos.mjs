import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

// makeId/modelId must match getCarDb() output: name.toLowerCase().replace(/\s+/g, '-')
// BMW -> 'bmw', '3 Series' -> '3-series'
// Mercedes-Benz -> 'mercedes-benz', 'C-Class' -> 'c-class'
// Audi -> 'audi', 'A4' -> 'a4'
const photos = [
  { makeId: 'bmw', modelId: '3-series', imageUrl: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?w=800', isDefault: true },
  { makeId: 'mercedes-benz', modelId: 'c-class', imageUrl: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800', isDefault: true },
  { makeId: 'audi', modelId: 'a4', imageUrl: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800', isDefault: true },
];

async function main() {
  // Reset and reseed with correct IDs
  const merged = [];
  for (const photo of photos) {
    merged.push({ id: `photo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, ...photo });
  }

  await p.siteSettings.upsert({
    where: { id: 'car_photos' },
    create: { id: 'car_photos', data: JSON.stringify(merged) },
    update: { data: JSON.stringify(merged) },
  });

  console.log(`Car photos seeded: ${merged.length} total`);
  await p.$disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });
