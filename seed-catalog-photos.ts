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
    { id: `photo_${Date.now()}_5`, makeId: 'toyota', modelId: 'camry', year: 2026, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1494976688153-c0427080d5b0?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_6`, makeId: 'toyota', modelId: 'highlander', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_7`, makeId: 'toyota', modelId: 'grand-highlander', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_8`, makeId: 'toyota', modelId: 'sienna', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&q=80&w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_9`, makeId: 'toyota', modelId: 'crown-signia', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_10`, makeId: 'toyota', modelId: 'tacoma', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_11`, makeId: 'toyota', modelId: 'tundra', year: 2024, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1590362891991-f776e747a588?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_12`, makeId: 'toyota', modelId: 'sequoia', year: 2023, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_13`, makeId: 'toyota', modelId: 'gr-corolla', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1549399542-7e82138f89fa?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_14`, makeId: 'bmw', modelId: '3-series', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_15`, makeId: 'mercedes-benz', modelId: 'c-class', year: 2025, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1549399542-7e82138f89fa?w=800', isDefault: true, createdAt: new Date().toISOString() },
    { id: `photo_${Date.now()}_16`, makeId: 'audi', modelId: 'a4', year: 2024, colorId: 'default', imageUrl: 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800', isDefault: true, createdAt: new Date().toISOString() },
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
