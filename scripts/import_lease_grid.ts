/**
 * Generic lease-grid importer.
 *
 * Reads a published lease grid CSV (one row per make/model/trim/term/credit_tier) and
 * populates the canonical relational tables so BOTH the catalog and the calculator
 * read the same authoritative data. Drop a new brand's CSV and re-run — it is idempotent.
 *
 * Usage:
 *   npx tsx scripts/import_lease_grid.ts <path-to-grid.csv> [--make Hyundai] [--year 2026]
 *
 * Optional photo map: scripts/_mc_photos.json  { "Model Name": { image: url, images: [..] } }
 * (produced by scripts/fetch_marketcheck_photos.ts)
 *
 * Populates:
 *   - VehicleMake / VehicleModel / VehicleTrim   (catalog hierarchy + headline rates)
 *   - Lender                                     (captive lender from the grid)
 *   - LeaseProgram (per term × tier, t1..t6)     (calculator buy-rates)
 *   - DealerAdjustment (per trim)                (MSRP - selling price)
 *   - OemIncentiveProgram (per model)            (default lease cash)
 *   - DealRecord (per trim, with grid + photo)   (catalog cards, exact published payment)
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ---- args ----
const argv = process.argv.slice(2);
const csvPath = argv.find(a => !a.startsWith('--')) || 'C:/Users/noobi/Downloads/Hyundai_lease_grid_2026-06.csv';
const argMake = (() => { const i = argv.indexOf('--make'); return i >= 0 ? argv[i + 1] : undefined; })();
const argYear = (() => { const i = argv.indexOf('--year'); return i >= 0 ? parseInt(argv[i + 1], 10) : undefined; })();

// ---- minimal RFC-4180 CSV parser (handles quoted fields with commas) ----
function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ',') { cur.push(field); field = ''; }
      else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; }
      else if (c === '\r') { /* skip */ }
      else field += c;
    }
  }
  if (field.length > 0 || cur.length > 0) { cur.push(field); rows.push(cur); }
  if (rows.length === 0) return [];
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.length > 1).map(r => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => { o[h] = (r[idx] ?? '').trim(); });
    return o;
  });
}

// ---- credit-tier mapping: grid label -> internal t1..t6 ----
const TIER_MAP: Record<string, string> = {
  'super elite': 't1',
  'elite': 't2',
  'standard': 't3',
  'standard plus': 't4',
  'progressive': 't5',
  'fair': 't6',
};
function tierKey(label: string): string | null {
  return TIER_MAP[(label || '').trim().toLowerCase()] || null;
}

const num = (v: any) => {
  if (v === undefined || v === null || v === '') return 0;
  const n = parseFloat(String(v).replace(/[^0-9.\-]/g, ''));
  return isNaN(n) ? 0 : n;
};

function lenderIsCaptive(name: string): boolean {
  const n = (name || '').toLowerCase();
  return n.includes('motor finance') || n.includes('financial services') || n.includes('financial') || n.includes('motor credit') || n.includes('financial corp');
}

async function main() {
  console.log(`Reading grid: ${csvPath}`);
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  console.log(`Parsed ${rows.length} rows`);

  // optional photo map
  let photoMap: Record<string, { image?: string; images?: string[] }> = {};
  const photoPath = path.join(process.cwd(), 'scripts', '_mc_photos.json');
  if (fs.existsSync(photoPath)) {
    try { photoMap = JSON.parse(fs.readFileSync(photoPath, 'utf8')); console.log(`Loaded photo map for ${Object.keys(photoMap).length} models`); }
    catch { console.warn('Could not parse _mc_photos.json'); }
  } else {
    console.log('No _mc_photos.json — DealRecords will have no images yet.');
  }

  const makeName = argMake || rows[0]?.make;
  if (!makeName) throw new Error('No make found');
  const yearDefault = argYear || num(rows[0]?.year) || new Date().getFullYear();
  console.log(`Make: ${makeName}, default year: ${yearDefault}`);

  // ---- active program batch (engine requires one) ----
  let batch = await prisma.programBatch.findFirst({ where: { status: 'ACTIVE' } });
  if (!batch) {
    batch = await prisma.programBatch.create({ data: { status: 'ACTIVE', isValid: true, publishedAt: new Date() } });
    console.log(`Created ACTIVE ProgramBatch ${batch.id}`);
  }

  // ---- lender (most common lender value for this make) ----
  const lenderCounts: Record<string, number> = {};
  for (const r of rows) { const l = r.lender?.trim(); if (l) lenderCounts[l] = (lenderCounts[l] || 0) + 1; }
  const lenderName = Object.entries(lenderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || `${makeName} Financial Services`;
  const lender = await prisma.lender.upsert({
    where: { name: lenderName },
    update: { isActive: true, isCaptive: lenderIsCaptive(lenderName), lenderType: lenderIsCaptive(lenderName) ? 'CAPTIVE' : 'NATIONAL_BANK' },
    create: { name: lenderName, isActive: true, isCaptive: lenderIsCaptive(lenderName), lenderType: lenderIsCaptive(lenderName) ? 'CAPTIVE' : 'NATIONAL_BANK', priority: 1 },
  });
  console.log(`Lender: ${lender.name} (captive=${lender.isCaptive})`);

  // ---- make ----
  const make = await prisma.vehicleMake.upsert({
    where: { name: makeName },
    update: { isActive: true },
    create: { name: makeName, isActive: true },
  });

  // ---- clean slate for this make so stale pre-import data can't shadow the grid ----
  // 1. Dealer adjustments + OEM incentives (engine filters on isActive).
  await prisma.dealerAdjustment.updateMany({ where: { make: { equals: makeName, mode: 'insensitive' } }, data: { isActive: false } });
  await prisma.oemIncentiveProgram.updateMany({ where: { make: { equals: makeName, mode: 'insensitive' } }, data: { isActive: false } });
  // 2. Models + trims: deactivate all; the grid upserts below re-activate only what's current.
  await prisma.vehicleModel.updateMany({ where: { makeId: make.id }, data: { isActive: false } });
  await prisma.vehicleTrim.updateMany({ where: { model: { makeId: make.id } }, data: { isActive: false } });
  // 3. Legacy BankPrograms for this make compete with our LeasePrograms in the active
  //    batch — park them in a non-active batch so only the grid drives this make.
  let parkBatch = await prisma.programBatch.findFirst({ where: { status: 'PARKED' } });
  if (!parkBatch) parkBatch = await prisma.programBatch.create({ data: { status: 'PARKED', isValid: false } });
  const parked = await prisma.bankProgram.updateMany({
    where: { make: { equals: makeName, mode: 'insensitive' }, batchId: batch.id },
    data: { batchId: parkBatch.id },
  });
  if (parked.count > 0) console.log(`Parked ${parked.count} legacy ${makeName} BankPrograms out of the active batch`);

  // ---- group rows by model -> trim ----
  type Row = Record<string, string>;
  const byModelTrim = new Map<string, Map<string, Row[]>>();
  for (const r of rows) {
    if ((r.make || '').toLowerCase() !== makeName.toLowerCase()) continue;
    const model = r.model?.trim();
    const trim = r.trim?.trim();
    if (!model || !trim) continue;
    if (!byModelTrim.has(model)) byModelTrim.set(model, new Map());
    const tm = byModelTrim.get(model)!;
    if (!tm.has(trim)) tm.set(trim, []);
    tm.get(trim)!.push(r);
  }

  let nModels = 0, nTrims = 0, nLeasePrograms = 0, nDeals = 0, nIncentives = 0;

  for (const [modelName, trimMap] of byModelTrim) {
    nModels++;
    const model = await prisma.vehicleModel.upsert({
      where: { makeId_name: { makeId: make.id, name: modelName } },
      update: { isActive: true, years: [yearDefault], ...(photoMap[modelName]?.image ? { imageUrl: photoMap[modelName].image } : {}) },
      create: { makeId: make.id, name: modelName, years: [yearDefault], isActive: true, imageUrl: photoMap[modelName]?.image || null },
    });

    // model-level incentive (use the largest lease cash seen for this model at 36mo)
    const modelIncentives = new Map<string, number>();

    for (const [trimName, trimRows] of trimMap) {
      nTrims++;
      const year = num(trimRows[0].year) || yearDefault;

      // pick a representative row: 36mo + Super Elite (t1), else 36mo any, else first
      const t1_36 = trimRows.find(r => num(r.term) === 36 && tierKey(r.credit_tier) === 't1');
      const any36 = trimRows.find(r => num(r.term) === 36);
      const rep = t1_36 || any36 || trimRows[0];

      const msrp = num(rep.msrp);
      const repSelling = num(rep.selling_price);
      const repDealerDiscount = Math.max(0, Math.round(msrp - repSelling));
      const repIncentive = num(rep.incentive_total);
      const repResidualPct = num(rep.residual_pct);
      const repMf = num(rep.money_factor);
      const repApr = num(rep.apr);

      if (modelName && repIncentive > 0) {
        const incName = (rep.incentives || '').replace(/\s*\$[\d,]+\s*$/, '').trim() || 'Lease Cash';
        modelIncentives.set(incName, Math.max(modelIncentives.get(incName) || 0, repIncentive));
      }

      // VehicleTrim (headline 36mo / t1 values + msrp)
      await prisma.vehicleTrim.upsert({
        where: { modelId_name: { modelId: model.id, name: trimName } },
        update: {
          isActive: true,
          msrpCents: Math.round(msrp * 100),
          baseMF: repMf,
          baseAPR: repApr,
          rv36: repResidualPct / 100,
          leaseCashCents: Math.round(repIncentive * 100),
        },
        create: {
          modelId: model.id,
          name: trimName,
          isActive: true,
          msrpCents: Math.round(msrp * 100),
          baseMF: repMf,
          baseAPR: repApr,
          rv36: repResidualPct / 100,
          leaseCashCents: Math.round(repIncentive * 100),
        },
      });

      // DealerAdjustment (MSRP - selling) for this trim. NOTE: the engine treats
      // DealerAdjustment.amount as CENTS (dealerDiscountCents), so store cents.
      const dealerDiscountCents = Math.round((msrp - repSelling) * 100);
      const existingAdj = await prisma.dealerAdjustment.findFirst({ where: { make: makeName, model: modelName, trim: trimName } });
      if (existingAdj) {
        await prisma.dealerAdjustment.update({ where: { id: existingAdj.id }, data: { amount: dealerDiscountCents, isActive: true } });
      } else {
        await prisma.dealerAdjustment.create({ data: { make: makeName, model: modelName, trim: trimName, amount: dealerDiscountCents, isActive: true } });
      }

      // Per-trim OEM lease cash (default applied). Matched by make/model/trim in the
      // engine; amount = the trim's representative (36mo) lease cash. Non-taxable cap
      // reduction, exclusive per trim so it never double-stacks.
      const trimSeedKey = `gridlease:${makeName}:${modelName}:${trimName}`.toLowerCase();
      if (repIncentive > 0) {
        const incName = (rep.incentives || '').replace(/\s*\$[\d,]+\s*$/, '').trim() || 'Lease Cash';
        await prisma.oemIncentiveProgram.upsert({
          where: { seedKey: trimSeedKey },
          update: { name: incName, amountCents: Math.round(repIncentive * 100), trim: trimName, isActive: true, status: 'PUBLISHED' },
          create: {
            seedKey: trimSeedKey, name: incName, amountCents: Math.round(repIncentive * 100),
            type: 'OEM_CASH', dealApplicability: 'LEASE', isTaxableCa: false,
            exclusiveGroupId: `${makeName}_${modelName}_${trimName}_LEASE`.toLowerCase(),
            make: makeName, model: modelName, trim: trimName, stackable: true, isActive: true, status: 'PUBLISHED',
          },
        });
        nIncentives++;
      } else {
        // no lease cash for this trim -> ensure any prior one is disabled
        await prisma.oemIncentiveProgram.updateMany({ where: { seedKey: trimSeedKey }, data: { isActive: false } });
      }

      // LeaseProgram per (term, tier) + grid object for the DealRecord
      const grid: Record<string, Record<string, any>> = {};
      for (const r of trimRows) {
        const term = num(r.term);
        const tk = tierKey(r.credit_tier);
        if (!term || !tk) continue;
        const residualPct = num(r.residual_pct);
        const mf = num(r.money_factor);
        const apr = num(r.apr);
        const monthly = num(r.monthly_payment);
        const incentive = num(r.incentive_total);
        const selling = num(r.selling_price);
        const das = num(r.due_at_signing);
        const dealerDiscount = Math.max(0, Math.round(msrp - selling));

        // grid cell (authoritative published numbers)
        if (!grid[String(term)]) grid[String(term)] = {};
        grid[String(term)][tk] = {
          payment: Math.round(monthly),
          mf,
          rv: residualPct / 100,
          incentive: Math.round(incentive),
          dealerDiscount,
          msrp: Math.round(msrp),
          dueAtSigning: Math.round(das),
          apr,
        };

        // LeaseProgram row (only mileage=10000 base; residual stored as percent)
        await prisma.leaseProgram.upsert({
          where: {
            lenderId_make_model_trim_year_term_mileage_internalLenderTier: {
              lenderId: lender.id, make: makeName, model: modelName, trim: trimName,
              year, term, mileage: 10000, internalLenderTier: tk,
            },
          },
          update: { buyRateMf: mf, residualPercentage: residualPct, isActive: true, status: 'PUBLISHED' },
          create: {
            lenderId: lender.id, make: makeName, model: modelName, trim: trimName, year,
            term, mileage: 10000, internalLenderTier: tk,
            buyRateMf: mf, residualPercentage: residualPct, isActive: true, status: 'PUBLISHED',
          },
        });
        nLeasePrograms++;
      }

      // DealRecord (catalog card) — idempotent by ingestionId
      const ingestionId = `gridlease:${makeName}:${modelName}:${trimName}:${year}`.toLowerCase();
      const photo = photoMap[modelName] || {};
      const incentivesList = Array.from(modelIncentives.entries()).map(([name, amount]) => ({ name, amount }));
      const financialData = {
        make: makeName,
        model: modelName,
        trim: trimName,
        year,
        msrp,
        type: 'lease',
        dealerDiscount: repDealerDiscount,
        defaultTerm: 36,
        grid,
        image: photo.image || null,
        images: photo.images || (photo.image ? [photo.image] : []),
        incentives: incentivesList,
        leaseCash: repIncentive,
        mf: repMf,
        rv: repResidualPct / 100,
        term: 36,
        region: rep.region || 'California',
        zip_code: rep.zip_code || '',
        source_url: rep.source_url || '',
      };

      const existingDeal = await prisma.dealRecord.findUnique({ where: { ingestionId } });
      if (existingDeal) {
        await prisma.dealRecord.update({
          where: { ingestionId },
          data: {
            type: 'lease', publishStatus: 'PUBLISHED', reviewStatus: 'APPROVED',
            lenderId: lender.id, financialData: JSON.stringify(financialData),
          },
        });
      } else {
        await prisma.dealRecord.create({
          data: {
            type: 'lease', ingestionId, publishStatus: 'PUBLISHED', reviewStatus: 'APPROVED',
            lenderId: lender.id, financialData: JSON.stringify(financialData),
          },
        });
      }
      nDeals++;
    }

  }

  console.log(`\nDone. models=${nModels} trims=${nTrims} leasePrograms=${nLeasePrograms} deals=${nDeals} oemIncentives=${nIncentives}`);
}

main()
  .catch(e => { console.error('IMPORT FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
