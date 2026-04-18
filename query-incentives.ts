import { PrismaClient } from './node_modules/.prisma/client';
const p = new PrismaClient();
async function main() {
  const trims = await p.vehicleTrim.findMany({
    where: { isActive: true },
    select: { id: true, name: true, photoLinks: true, model: { select: { name: true, imageUrl: true, make: { select: { name: true } } } } },
    orderBy: { model: { make: { name: 'asc' } } }
  });
  const noPhoto = trims.filter(t => !t.photoLinks && !t.model.imageUrl);
  const withPhoto = trims.filter(t => t.photoLinks || t.model.imageUrl);
  console.log('No photo:', noPhoto.length);
  console.log('With photo:', withPhoto.length);
  const makes = new Map();
  noPhoto.forEach(t => { const k = t.model.make.name; makes.set(k, (makes.get(k)||0)+1); });
  console.log('No photo by make:', Object.fromEntries(makes));
  const makesPhoto = new Map();
  withPhoto.forEach(t => { const k = t.model.make.name; makesPhoto.set(k, (makesPhoto.get(k)||0)+1); });
  console.log('With photo by make:', Object.fromEntries(makesPhoto));
  await p.$disconnect();
}
main();
