import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const links = [
  { email: 'admin@hunter-lease-test.com', firebaseUid: 'xfSP2KhJiaO6n3Y0XeKnNjy4CU63' },
  { email: 'dealer@hunter-lease-test.com', firebaseUid: 'zyDC5EPQ6WV3K5lpTm1eYHyr6NA2' },
];

for (const l of links) {
  const user = await prisma.user.findFirst({ where: { email: l.email } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { firebaseUid: l.firebaseUid } });
    console.log(`✅ ${l.email} (role=${user.role}) → firebaseUid=${l.firebaseUid}`);
  } else {
    console.log(`⚠️ ${l.email} not found in DB`);
  }
}

await prisma.$disconnect();
