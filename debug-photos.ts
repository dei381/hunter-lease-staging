import db from './server/lib/db';

async function main() {
  // Get photos
  const photosRec = await db.siteSettings.findUnique({ where: { id: 'car_photos' } });
  const photos = photosRec?.data ? JSON.parse(photosRec.data) : [];
  console.log('Photos:', photos.length);
  photos.forEach((p: any) => console.log(`  ${p.makeId}/${p.modelId} → ${p.imageUrl?.slice(0, 60)}`));
  
  // Get trims
  const trims = await db.vehicleTrim.findMany({
    where: { isActive: true, msrpCents: { gt: 0 } },
    include: { model: { include: { make: true } } }
  });
  
  console.log('\nTrims:', trims.length);
  for (const t of trims) {
    const makeKey = t.model.make.name.toLowerCase().replace(/\s+/g, '-');
    const modelKey = t.model.name.toLowerCase().replace(/\s+/g, '-');
    const match = photos.find((p: any) => p.makeId === makeKey && p.modelId === modelKey);
    console.log(`  ${t.model.make.name} ${t.model.name} ${t.name} → key=${makeKey}/${modelKey} → ${match ? 'MATCH' : 'NO MATCH'}`);
  }
  
  await db.$disconnect();
}
main();
