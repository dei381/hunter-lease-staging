import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.user.upsert({ where: { email: 'admin@hunter-lease-test.com' }, update: { role: 'SUPER_ADMIN' }, create: { email: 'admin@hunter-lease-test.com', name: 'Test Admin', role: 'SUPER_ADMIN' } });
  await p.user.upsert({ where: { email: 'dealer@hunter-lease-test.com' }, update: { role: 'SALES_AGENT' }, create: { email: 'dealer@hunter-lease-test.com', name: 'Test Dealer', role: 'SALES_AGENT' } });
  console.log('Users created OK');
  await p.$disconnect();
}
main().catch(e => { console.error(e); process.exit(1); });
