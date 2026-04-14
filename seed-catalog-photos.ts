import db from './server/lib/db';

async function main() {
  const r = await db.siteSettings.findUnique({ where: { id: 'car_photos' } });
  const existing = r?.data ? JSON.parse(r.data) : [];
  
  console.log('Existing:', existing.length);
  
  const newPhotos = [
    { id: `photo_${Date.now()}_1`, makeId: 'bmw', modelId: 'x5', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_2`, makeId: 'bmw', modelId: '5-series', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_3`, makeId: 'mercedes-benz', modelId: 'e-class', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_4`, makeId: 'audi', modelId: 'q5', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800', isDefault: true, createdAt: new Date().toISOString() },
  ];
  
  // Don't duplicate existing makeId+modelId
  const existingKeys = new Set(existing.map((p: any) => `${p.makeId}/${p.modelId}`));
  const toAdd = newPhotos.filter(p => !existingKeys.has(`${p.makeId}/${p.modelId}`));
  
  const all = [...existing, ...toAdd];
  
  await db.siteSettings.upsert({
    where: { id: 'car_photos' },
    update: { data: JSON.stringify(all) },
    create: { id: 'car_photos', data: JSON.stringify(all) }
  });
  
  console.log(`Added ${toAdd.length} photos. Total: ${all.length}`);
  await db.$disconnect();
}
main();
