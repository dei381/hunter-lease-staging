import { PrismaClient } from './node_modules/.prisma/client';
const p = new PrismaClient();

const modelPhotos: Record<string, string> = {
  '5f274aac-7922-4a3a-8216-45e62eed845c': 'https://www.bmwusa.com/content/bmwusa/marketUS/bmwusa_com/en/vehicles/3-series/sedan/overview/jcr:content/par-model-hero/component/image.transform/fullscreen/image.1741640506181.jpg',
  '67d8863b-f7ae-49e4-a62f-4858de2b52f4': 'https://www.bmwusa.com/content/bmwusa/marketUS/bmwusa_com/en/vehicles/5-series/sedan/overview/jcr:content/par-model-hero/component/image.transform/fullscreen/image.1741640541397.jpg',
  '3fefdf88-d12d-4252-8a43-53d4d054f8c3': 'https://www.bmwusa.com/content/bmwusa/marketUS/bmwusa_com/en/vehicles/X-models/SAV/x5/overview/jcr:content/par-model-hero/component/image.transform/fullscreen/image.1741640647419.jpg',
  'f71b2b2a-8c90-4340-9a42-6c5db792ad76': 'https://www.mbusa.com/content/dam/mb-nafta/us/myco/my25/c-class/sedan/class-page/gallery/2025-C-CLASS-SEDAN-GAL-001-WP.jpg',
  '3ab5bbe6-80b8-4b49-a8f2-48d1babf6cc9': 'https://www.mbusa.com/content/dam/mb-nafta/us/myco/my25/e-class/sedan/class-page/gallery/2025-E-CLASS-SEDAN-GAL-001-WP.jpg',
  '88bb2495-9009-48c2-8a4f-94a78aa8c9f4': 'https://mediaservice.audi.com/media/live/50900/fly1400x601n8/f83rj7/2024.png',
  'e94eff74-a490-4aeb-b1d9-112daa347c20': 'https://mediaservice.audi.com/media/live/50900/fly1400x601n8/fyd1d2/2024.png',
  'd279eb80-167a-4fb3-9168-2876fa4ebfa3': 'https://pressroom.toyota.com/wp-content/uploads/2024/01/2025_Tacoma_TRDSport_001.jpg',
  '8389143c-c199-412f-89cb-c935b694656d': 'https://pressroom.toyota.com/wp-content/uploads/2023/06/2024_Grand_Highlander_Limited_001.jpg',
  '6adb8fef-b903-4c76-ab43-b13e9f3aacd3': 'https://pressroom.toyota.com/wp-content/uploads/2023/11/2025_Highlander_XLE_001.jpg',
  'a3f86651-d1a0-42bc-89d1-cac3aa8d5906': 'https://pressroom.toyota.com/wp-content/uploads/2023/11/2025_Sienna_LE_001.jpg',
  '73a2686d-f78c-4cbb-a229-5819390096f1': 'https://pressroom.toyota.com/wp-content/uploads/2024/01/2025_GR_Corolla_001.jpg',
  '85c81ad8-0fcf-46f2-9aed-083efc95bd9b': 'https://pressroom.toyota.com/wp-content/uploads/2024/06/2025_Crown_Signia_Limited_001.jpg',
  '27d9aa52-cdaf-4906-95c8-93044d29b4cd': 'https://pressroom.toyota.com/wp-content/uploads/2024/01/2025_Camry_XSE_001.jpg',
  '96fd28fa-d278-4e91-a67f-d8c03314a450': 'https://pressroom.toyota.com/wp-content/uploads/2022/01/2023_Sequoia_TRD_Pro_001.jpg',
  '01b55969-dee9-4c47-bfe8-a14449ad7ba5': 'https://pressroom.toyota.com/wp-content/uploads/2023/09/2024_Tundra_Platinum_001.jpg',
};

async function main() {
  for (const [id, url] of Object.entries(modelPhotos)) {
    const result = await p.vehicleModel.update({
      where: { id },
      data: { imageUrl: url },
      select: { id: true, name: true }
    });
    console.log('Updated:', result.name);
  }
  
  // Verify
  const remaining = await p.vehicleTrim.findMany({
    where: { isActive: true },
    select: { name: true, photoLinks: true, model: { select: { name: true, imageUrl: true, make: { select: { name: true } } } } }
  });
  const stillMissing = remaining.filter(t => (!t.photoLinks || (Array.isArray(t.photoLinks) && t.photoLinks.length === 0)) && !t.model.imageUrl);
  console.log('Still missing photos:', stillMissing.length);
  if (stillMissing.length > 0) {
    stillMissing.forEach(t => console.log(' -', t.model.make.name, t.model.name, t.name));
  }
  await p.$disconnect();
}
main();
