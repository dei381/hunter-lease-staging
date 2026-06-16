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

// ---- rich 'incentives' string parser ----
// The 'incentives' column is a ';'-separated list of "Name $Amount [marker]" items, e.g.
//   "HMF Special Lease $250 [applied]; HMA Retail Bonus Cash $2,000 [cond: ANY 0-1000]; ..."
//   [applied] = already baked into the advertised payment (these SUM to incentive_total) -> auto-applied.
//   [cond: ...] = available/potential rebate, NOT in the advertised payment -> customer-selectable.
// Robust to commas inside amounts ("$2,000") and multiple ';'-separated items.
function parseIncentives(s: string): { name: string; amount: number; applied: boolean }[] {
  if (!s) return [];
  return s.split(';').map(part => part.trim()).filter(Boolean).map(part => {
    const m = part.match(/^(.*?)\s*\$([\d,]+(?:\.\d+)?)\s*\[(applied|cond[^\]]*)\]\s*$/i);
    if (!m) return null;
    const name = m[1].trim();
    const amount = parseFloat(m[2].replace(/,/g, '')) || 0;
    const applied = /^applied$/i.test(m[3].trim());
    return { name, amount, applied };
  }).filter(Boolean) as { name: string; amount: number; applied: boolean }[];
}

// Clean display name for the auto-applied OEM_CASH: the names of the '[applied]' items
// only (the raw string also lists every [cond:] item, so it must NOT be used as the name).
function appliedName(raw: string, fallback: string): string {
  const applied = parseIncentives(raw).filter(i => i.applied).map(i => i.name);
  return applied.length ? applied.join(' + ') : fallback;
}

// Map a rebate name to a DB incentive type. Anything that is NOT 'OEM_CASH' is treated
// by DataResolver as selectable (isDefault=false). 'OEM_CASH' is reserved for the
// auto-applied cash baked into the advertised payment.
function incentiveTypeByName(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('college grad')) return 'college';
  if (n.includes('first responder')) return 'first_responder';
  if (n.includes('military')) return 'military';
  return 'other';
}

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
  // 1. OEM incentives reset. Dealer discounts are NOT imported from the source grid —
  //    discounts must be set by the admin in the discount manager — so we DELETE any
  //    dealer adjustments we previously created for this make.
  await prisma.dealerAdjustment.deleteMany({ where: { make: { equals: makeName, mode: 'insensitive' } } });
  await prisma.oemIncentiveProgram.updateMany({ where: { make: { equals: makeName, mode: 'insensitive' } }, data: { isActive: false } });
  // 2. Models + trims: deactivate all; the grid upserts below re-activate only what's current.
  await prisma.vehicleModel.updateMany({ where: { makeId: make.id }, data: { isActive: false } });
  await prisma.vehicleTrim.updateMany({ where: { model: { makeId: make.id } }, data: { isActive: false } });
  // 2b. Lease/Finance programs: deactivate ALL for this make so stale rows from a prior
  //     grid (e.g. last year's terms/rates) can't shadow the new grid. The lease upserts
  //     below re-activate the current lease rows; the finance importer (run next) does the
  //     same for finance. Without this, an old 2025 LeaseProgram (mf 0.00282) coexisted with
  //     the new 2026 row (mf 0.00219) and the calculator resolved the stale one -> the
  //     catalog and calculator disagreed by >$150 on the same car.
  await prisma.leaseProgram.updateMany({ where: { make: { equals: makeName, mode: 'insensitive' } }, data: { isActive: false } });
  await prisma.financeProgram.updateMany({ where: { make: { equals: makeName, mode: 'insensitive' } }, data: { isActive: false } });
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
  // Track which grid cards we (re)published this run so we can archive stale ones below
  // (e.g. a prior 2025 grid card whose trim is gone from the current 2026 grid — it would
  // otherwise linger PUBLISHED and disagree with the calculator, since its LeaseProgram
  // rows were not refreshed for that year).
  const seenIngestionIds = new Set<string>();

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
        const incName = appliedName(rep.incentives, 'Lease Cash');
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

      // NOTE: we intentionally do NOT create a DealerAdjustment from the source
      // selling price. Dealer discounts are the admin's to set in the discount manager.

      // Per-(trim, term) incentives — the amount depends on term (client spec).
      // eligibilityRules.terms is what the engine's term filter reads. dealApplicability
      // 'ALL' so it applies to both lease and finance. OEM_CASH/rebate auto-applies and
      // reduces the cap cost (non-taxable), not the residual. One incentive per term
      // (amount is constant across tiers within a term).
      const seenIncTerms = new Set<number>();
      for (const r of trimRows) {
        const term = num(r.term);
        if (!term || seenIncTerms.has(term)) continue;
        seenIncTerms.add(term);
        const incAmount = num(r.incentive_total);
        const incName = appliedName(r.incentives, 'Lease Cash');
        const seedKey = `gridinc-lease:${makeName}:${modelName}:${trimName}:${term}`.toLowerCase();
        if (incAmount > 0) {
          // Lease incentives (dealApplicability LEASE). Manufacturer cash baked into the
          // advertised payment -> auto-apply (OEM_CASH) and reduce the cap, not the residual.
          // This is the SUM of the '[applied]' items (e.g. the $250 HMF Special Lease) and
          // preserves the current behavior that matches the advertised payment exactly.
          await prisma.oemIncentiveProgram.upsert({
            where: { seedKey },
            update: { name: incName, amountCents: Math.round(incAmount * 100), trim: trimName, type: 'OEM_CASH', eligibilityRules: { terms: [term] }, isActive: true, status: 'PUBLISHED' },
            create: {
              seedKey, name: incName, amountCents: Math.round(incAmount * 100),
              type: 'OEM_CASH', dealApplicability: 'LEASE', isTaxableCa: false,
              exclusiveGroupId: `${makeName}_${modelName}_${trimName}_INC`.toLowerCase(),
              make: makeName, model: modelName, trim: trimName,
              eligibilityRules: { terms: [term] }, stackable: true, isActive: true, status: 'PUBLISHED',
            },
          });
          nIncentives++;
        }

        // SELECTABLE rebates: one OemIncentiveProgram per '[cond:]' item in the string.
        // '[applied]' items are already summed into the OEM_CASH above, so skip them here.
        // Type is the by-name value (NOT OEM_CASH) so DataResolver sets isDefault=false and
        // the resolver / IncentivesModal treat it as opt-in. No exclusiveGroupId: each
        // selectable rebate stands alone (the '_INC' group is reserved for the auto-applied
        // cash; grouping cond items there would make the resolver keep only the highest).
        for (const item of parseIncentives(r.incentives)) {
          if (item.applied) continue;
          if (item.amount <= 0) continue;
          const condSeed = `gridinc-lease-opt:${makeName}:${modelName}:${trimName}:${term}:${item.name}`.toLowerCase().replace(/\s+/g, '-');
          await prisma.oemIncentiveProgram.upsert({
            where: { seedKey: condSeed },
            update: { name: item.name, amountCents: Math.round(item.amount * 100), trim: trimName, type: incentiveTypeByName(item.name), eligibilityRules: { terms: [term] }, isActive: true, status: 'PUBLISHED' },
            create: {
              seedKey: condSeed, name: item.name, amountCents: Math.round(item.amount * 100),
              type: incentiveTypeByName(item.name), dealApplicability: 'LEASE', isTaxableCa: false,
              make: makeName, model: modelName, trim: trimName,
              eligibilityRules: { terms: [term] }, stackable: true, isActive: true, status: 'PUBLISHED',
            },
          });
          nIncentives++;
        }
      }

      // LeaseProgram rows per (term, tier) — the per-tier buy-rates the calculator uses.
      for (const r of trimRows) {
        const term = num(r.term);
        const tk = tierKey(r.credit_tier);
        if (!term || !tk) continue;
        const residualPct = num(r.residual_pct);
        const mf = num(r.money_factor);

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
      seenIngestionIds.add(ingestionId);
      const photo = photoMap[modelName] || {};
      const incentivesList = Array.from(modelIncentives.entries()).map(([name, amount]) => ({ name, amount }));
      const financialData = {
        make: makeName,
        model: modelName,
        trim: trimName,
        year,
        msrp,
        type: 'lease',
        dealerDiscount: 0, // discounts are admin-managed, not taken from the source grid
        defaultTerm: 36,
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

  // Archive stale grid cards for this make: any gridlease:<make>:* DealRecord we did NOT
  // refresh this run (old year / dropped trim). Keeps the catalog == calculator.
  const staleArchive = await prisma.dealRecord.updateMany({
    where: {
      ingestionId: { startsWith: `gridlease:${makeName}:`.toLowerCase() },
      publishStatus: { not: 'ARCHIVED' },
      NOT: { ingestionId: { in: Array.from(seenIngestionIds) } },
    },
    data: { publishStatus: 'ARCHIVED' },
  });
  if (staleArchive.count > 0) console.log(`Archived ${staleArchive.count} stale ${makeName} grid cards not in the current grid`);

  console.log(`\nDone. models=${nModels} trims=${nTrims} leasePrograms=${nLeasePrograms} deals=${nDeals} oemIncentives=${nIncentives}`);
}

main()
  .catch(e => { console.error('IMPORT FAILED:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
