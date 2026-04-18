import { PrismaClient } from './node_modules/.prisma/client';
const p = new PrismaClient();
async function main() {
  const trims = await p.vehicleTrim.findMany({
    where: { isActive: true },
    select: { id: true, name: true, photoLinks: true, model: { select: { id: true, name: true, imageUrl: true, make: { select: { name: true } } } } }
  });
  const noPhoto = trims.filter(t => (!t.photoLinks || (Array.isArray(t.photoLinks) && t.photoLinks.length === 0)) && !t.model.imageUrl);
  for (const t of noPhoto) {
    console.log(t.model.make.name, t.model.name, t.name, '|', t.model.id);
  }
  await p.$disconnect();
}
main();
