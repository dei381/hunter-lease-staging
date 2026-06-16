/**
 * Drift diagnostic for the "divergent paths" deep layer.
 *
 * For every published LEASE deal, this runs BOTH production engine paths and reports
 * where the same car gets a different payment:
 *   - CATALOG  : DealEngineFacade.mapCatalogDeals  (uses the deal's STORED financialData)
 *   - CALCULATOR: DealEngineFacade.calculateForConsumer (resolves rates/discount/incentives LIVE from the DB)
 *
 * Tax and fees are held equal (zip 00000 -> statewide 8.875%, tier t1, 12k mi, $3,000 DAS)
 * so the delta isolates the DEEP layer: money factor, residual, discount, and incentives
 * (stored snapshot vs live LeaseProgram / DealerAdjustment / OemIncentive resolution).
 *
 * Usage:  DATABASE_URL=... npx tsx scripts/diagnose_path_drift.ts [limit]
 *
 * It is READ-ONLY (no writes). Run it against staging or a prod replica.
 */
import { PrismaClient } from '@prisma/client';
import { DealEngineFacade } from '../server/services/engine/DealEngineFacade';
import { getCarDb } from '../server/utils/carDb';

const prisma = new PrismaClient();

const TIER = 't1';
const MILEAGE = 12000;
const DOWN_DOLLARS = 3000;
const ZIP = '00000'; // unknown ZIP -> getTaxRateByZip default 0.08875, matching the catalog
const MATCH_THRESHOLD = 5; // |monthly delta| <= $5 counts as "in agreement"

function n(v: any, d = 0): number {
  if (v == null) return d;
  if (typeof v === 'number') return v;
  if (typeof v === 'object' && v.value != null) return n(v.value, d);
  const p = parseFloat(String(v).replace(/[^0-9.-]+/g, ''));
  return isNaN(p) ? d : p;
}

async function buildCarDbMaps() {
  // Mirror server.ts getCachedCarDbMaps EXACTLY: the production catalog passes the
  // rate-grid maps (LeaseProgram/FinanceProgram/OemIncentive/DealerAdjustment) into
  // mapCatalogDeals. Building only the carDb maps here would silently run the
  // catalog path in its legacy fallback mode and report phantom drift.
  const [CAR_DB, leaseRows, financeRows, incentiveRows, dealerAdjRows]: any[] = await Promise.all([
    getCarDb(),
    prisma.leaseProgram.findMany({ where: { isActive: true, status: 'PUBLISHED' } }).catch(() => []),
    prisma.financeProgram.findMany({ where: { isActive: true, status: 'PUBLISHED' } }).catch(() => []),
    prisma.oemIncentiveProgram.findMany({ where: { isActive: true, status: 'PUBLISHED' } }).catch(() => []),
    prisma.dealerAdjustment.findMany({ where: { isActive: true } }).catch(() => [])
  ]);

  const makeMap = new Map(), modelMap = new Map(), trimMap = new Map();
  for (const make of CAR_DB?.makes || []) {
    const mk = make.name?.toLowerCase();
    if (!mk) continue;
    makeMap.set(mk, make);
    for (const model of make.models || []) {
      const mdl = `${mk}-${model.name?.toLowerCase()}`;
      modelMap.set(mdl, model);
      for (const trim of model.trims || []) trimMap.set(`${mdl}-${trim.name?.toLowerCase()}`, trim);
    }
  }

  const leaseGridMap = new Map();
  const gridTrimsByModel = new Map<string, Set<string>>();
  for (const p of leaseRows) {
    leaseGridMap.set(`${p.make}|${p.model}|${p.trim}|${p.term}|${p.internalLenderTier}`.toLowerCase(),
      { mf: Number(p.buyRateMf), rv: Number(p.residualPercentage) / 100 });
    const mk = `${p.make}|${p.model}`.toLowerCase();
    if (!gridTrimsByModel.has(mk)) gridTrimsByModel.set(mk, new Set());
    gridTrimsByModel.get(mk)!.add(p.trim);
  }
  const financeGridMap = new Map();
  for (const p of financeRows) {
    financeGridMap.set(`${p.make}|${p.model}|${p.trim}|${p.term}|${p.internalLenderTier}`.toLowerCase(),
      { apr: Number(p.buyRateApr) });
  }
  const incentiveGridMap = new Map<string, any[]>();
  for (const inc of incentiveRows) {
    const key = `${inc.make}|${inc.model || ''}|${inc.trim || ''}`.toLowerCase();
    if (!incentiveGridMap.has(key)) incentiveGridMap.set(key, []);
    incentiveGridMap.get(key)!.push(inc);
  }
  const dealerAdjMap = new Map<string, any[]>();
  for (const adj of dealerAdjRows) {
    const key = (adj.make || '').toLowerCase();
    if (!dealerAdjMap.has(key)) dealerAdjMap.set(key, []);
    dealerAdjMap.get(key)!.push(adj);
  }

  return { makeMap, modelMap, trimMap, leaseGridMap, financeGridMap, incentiveGridMap, dealerAdjMap, gridTrimsByModel };
}

async function main() {
  const limit = process.argv[2] ? parseInt(process.argv[2], 10) : undefined;
  const cachedMaps = await buildCarDbMaps();
  const sset: any = await prisma.siteSettings.findUnique({ where: { id: 'global' } });
  let settings: any = {};
  try { settings = JSON.parse(sset?.data || '{}'); } catch {}

  // Mirror the /api/deals catalog filter (server.ts): not ARCHIVED, not expired,
  // and (reviewStatus APPROVED or publishStatus PUBLISHED).
  const deals = await prisma.dealRecord.findMany({
    where: {
      AND: [
        { publishStatus: { not: 'ARCHIVED' } },
        { OR: [{ expirationDate: null }, { expirationDate: { gt: new Date() } }] },
        { OR: [{ reviewStatus: 'APPROVED' }, { publishStatus: 'PUBLISHED' }] },
      ],
    },
    take: limit,
  });
  console.log(`\nAnalyzing ${deals.length} catalog (active) deals (tier=${TIER}, ${MILEAGE} mi, $${DOWN_DOLLARS} DAS, tax=statewide default)\n`);

  let lease = 0, matched = 0, errored = 0, calcNoPrice = 0;
  const drift: any[] = [];

  for (const deal of deals) {
    let fd: any = {};
    try { fd = JSON.parse((deal as any).financialData || '{}'); } catch { errored++; continue; }
    if (String(fd.type || 'lease').toLowerCase() !== 'lease') continue;
    lease++;
    const term = parseInt(String(fd.term || 36), 10) || 36;
    const car = `${fd.year || ''} ${fd.make || ''} ${fd.model || ''} ${fd.trim || ''}`.replace(/\s+/g, ' ').trim();

    let cat: any = null, calc: any = null;
    try {
      cat = DealEngineFacade.mapCatalogDeals([{ deal, data: fd }], cachedMaps, settings,
        { tier: TIER, term: String(term), mileage: String(MILEAGE), down: String(DOWN_DOLLARS) })?.[0]?.computed;
    } catch (e: any) { errored++; continue; }
    try {
      calc = await DealEngineFacade.calculateForConsumer(
        { vehicleId: deal.id, type: 'lease', term, creditTier: TIER, mileage: MILEAGE, zipCode: ZIP, downPaymentCents: DOWN_DOLLARS * 100 });
    } catch (e: any) { errored++; continue; }

    const catalogPay = n(cat?.payment);
    if (!calc || calc.calcStatus !== 'SUCCESS') {
      calcNoPrice++;
      drift.push({ car, catalogPay, calcPay: null, delta: null, status: calc?.calcStatus || 'ERROR', fields: ['calculator could not price (no live program)'] });
      continue;
    }
    const calcPay = n(calc.monthlyPaymentCents) / 100;
    const delta = +(catalogPay - calcPay).toFixed(2);

    const fields: string[] = [];
    const msrpC = n(calc.msrpCents) || (n(cat?.msrp) * 100);
    const catMf = n(cat?.mf), calcMf = n(calc.appliedMf);
    if (Math.abs(catMf - calcMf) > 0.00005) fields.push(`mf ${catMf}->${calcMf}`);
    const catRv = n(cat?.rv) > 1 ? n(cat?.rv) / Math.max(n(cat?.msrp), 1) : n(cat?.rv);
    const calcRv = msrpC ? n(calc.residualValueCents) / msrpC : 0;
    if (Math.abs(catRv - calcRv) > 0.005) fields.push(`rv ${(catRv * 100).toFixed(1)}%->${(calcRv * 100).toFixed(1)}%`);
    const catDisc = n(cat?.discount), calcDisc = n(calc.dealerDiscountCents) / 100;
    if (Math.abs(catDisc - calcDisc) > 25) fields.push(`discount $${catDisc}->$${calcDisc}`);
    const catInc = Math.max(n(cat?.leaseCash), n(cat?.rebates)), calcInc = n(calc.totalIncentivesCents) / 100;
    if (Math.abs(catInc - calcInc) > 25) fields.push(`incentives $${catInc}->$${calcInc}`);

    if (Math.abs(delta) <= MATCH_THRESHOLD) matched++;
    else drift.push({ car, catalogPay, calcPay, delta, status: 'SUCCESS', fields });
  }

  // ---- Report ----
  const priced = drift.filter(d => d.delta != null);
  priced.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  console.log('================ SUMMARY ================');
  console.log(`Lease deals analyzed:        ${lease}`);
  console.log(`In agreement (|Δ| <= $${MATCH_THRESHOLD}):   ${matched}`);
  console.log(`Drifted (different payment): ${priced.length}`);
  console.log(`Calculator could not price:  ${calcNoPrice}  (catalog shows a deal the calculator can't quote)`);
  console.log(`Errored/skipped:             ${errored}`);
  if (priced.length) {
    const deltas = priced.map(d => Math.abs(d.delta)).sort((a, b) => a - b);
    const med = deltas[Math.floor(deltas.length / 2)];
    const fieldCounts: Record<string, number> = {};
    for (const d of priced) for (const f of d.fields) fieldCounts[f.split(' ')[0]] = (fieldCounts[f.split(' ')[0]] || 0) + 1;
    console.log(`\nDrift magnitude |Δ/mo|: median $${med?.toFixed(2)}, max $${deltas[deltas.length - 1]?.toFixed(2)}`);
    console.log('Drift attributed to:', JSON.stringify(fieldCounts));
    console.log('\n--- Top 15 worst drifts ---');
    for (const d of priced.slice(0, 15)) {
      console.log(`  Δ$${String(d.delta).padStart(8)}  catalog $${d.catalogPay}/mo vs calc $${d.calcPay}/mo  | ${d.car}  | ${d.fields.join(', ') || 'inputs match, fee/rounding'}`);
    }
  }
  if (calcNoPrice) {
    console.log(`\n--- ${calcNoPrice} deal(s) the calculator cannot price (sample) ---`);
    for (const d of drift.filter(x => x.delta == null).slice(0, 10)) console.log(`  ${d.car}  (catalog shows $${d.catalogPay}/mo, calc=${d.status})`);
  }
  console.log('\nDone.');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
