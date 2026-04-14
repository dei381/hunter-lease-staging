import db from './server/lib/db';

async function main() {
  const r = await db.siteSettings.findUnique({ where: { id: 'car_photos' } });
  const photos = r?.data ? JSON.parse(r.data) : [];
  console.log('Photos count:', photos.length);
  photos.slice(0, 10).forEach((p: any) => console.log(`  ${p.makeId}/${p.modelId} → ${p.imageUrl?.slice(0, 80)}`));
  await db.$disconnect();
}
main();
