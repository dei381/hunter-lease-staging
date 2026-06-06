/**
 * Gate the public launch to a single brand (default Hyundai). Reversible.
 *  - VehicleMake.isActive = (name === target)  -> calculator picker shows only the brand
 *  - DealRecords NOT from this brand's grid import are ARCHIVED -> catalog shows only the brand
 *
 * Usage: npx tsx scripts/set_launch_brand.ts [--make Hyundai]
 * To restore a brand later: re-activate its make + un-archive / re-import its deals.
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const target = (() => { const i = argv.indexOf('--make'); return i >= 0 ? argv[i + 1] : 'Hyundai'; })();

(async () => {
  const out: any = { target };

  // 1. Only the target make is active
  const allMakes = await prisma.vehicleMake.findMany({ select: { id: true, name: true } });
  for (const m of allMakes) {
    await prisma.vehicleMake.update({ where: { id: m.id }, data: { isActive: m.name.toLowerCase() === target.toLowerCase() } });
  }
  out.activeMake = target;

  // 2. Archive every published deal that is NOT part of this brand's grid import
  const keepPrefix = `gridlease:${target.toLowerCase()}:`;
  const toArchive = await prisma.dealRecord.findMany({
    where: {
      publishStatus: { not: 'ARCHIVED' },
      OR: [
        { ingestionId: null },
        { NOT: { ingestionId: { startsWith: keepPrefix } } },
      ],
    },
    select: { id: true },
  });
  if (toArchive.length) {
    await prisma.dealRecord.updateMany({
      where: { id: { in: toArchive.map(d => d.id) } },
      data: { publishStatus: 'ARCHIVED' },
    });
  }
  out.archivedDeals = toArchive.length;

  // 3. Confirm what remains visible
  const visible = await prisma.dealRecord.count({ where: { publishStatus: { not: 'ARCHIVED' }, reviewStatus: 'APPROVED' } });
  const gridDeals = await prisma.dealRecord.count({ where: { ingestionId: { startsWith: keepPrefix }, publishStatus: 'PUBLISHED' } });
  out.visibleApprovedDeals = visible;
  out.targetGridDealsPublished = gridDeals;

  fs.writeFileSync('scripts/_launch_brand.json', JSON.stringify(out, null, 2));
  console.log(JSON.stringify(out));
})().catch(e => { console.error('ERR', e.message); process.exit(1); }).finally(() => prisma.$disconnect());
