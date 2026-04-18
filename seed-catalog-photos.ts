import db from './server/lib/db';

async function main() {
  const r = await db.siteSettings.findUnique({ where: { id: 'car_photos' } });
  const existing = r?.data ? JSON.parse(r.data) : [];
  const placeholderHostPattern = /(pixabay\.com|pexels\.com|unsplash\.com)/i;
  const cleaned = existing.filter((photo: any) => !placeholderHostPattern.test(String(photo?.imageUrl || '')));
  
  await db.siteSettings.upsert({
    where: { id: 'car_photos' },
    update: { data: JSON.stringify(cleaned) },
    create: { id: 'car_photos', data: JSON.stringify(cleaned) }
  });
  
  console.log(`Removed ${existing.length - cleaned.length} placeholder fallback photos. Total: ${cleaned.length}`);
  await db.$disconnect();
}
main();
