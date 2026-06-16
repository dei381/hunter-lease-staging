/**
 * Finance-grid importer — companion to import_lease_grid.ts.
 *
 * Reads a finance grid CSV (one row per make/model/trim/term/credit_tier with an APR)
 * and populates FinanceProgram (per term × tier, t1..t6) so the calculator can compute
 * finance quotes. Also tops up per-(trim,term) incentives for finance-only terms
 * (54/60/66/72 etc.) that the lease grid doesn't cover — shared 'ALL' incentive set,
 * term-scoped via eligibilityRules.terms, so it never duplicates the lease incentives.
 *
 * Run AFTER import_lease_grid.ts (which does the make-level clean slate). This importer
 * does NOT clean-slate incentives — it only upserts.
 *
 * Usage: npx tsx scripts/import_finance_grid.ts <finance-grid.csv> [--make Hyundai] [--year 2026]
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();
const argv = process.argv.slice(2);
const csvPath = argv.find(a => !a.startsWith('--')) || 'C:/Users/noobi/Downloads/Hyundai_finance_grid_2026-06.csv';
const argMake = (() => { const i = argv.indexOf('--make'); return i >= 0 ? argv[i + 1] : undefined; })();
const argYear = (() => { const i = argv.indexOf('--year'); return i >= 0 ? parseInt(argv[i + 1], 10) : undefined; })();

function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else { if (c === '"') inQ = true; else if (c === ',') { cur.push(field); field = ''; } else if (c === '\n') { cur.push(field); rows.push(cur); cur = []; field = ''; } else if (c === '\r') {} else field += c; }
  }
  if (field.length || cur.length) { cur.push(field); rows.push(cur); }
  const header = rows[0].map(h => h.trim());
  return rows.slice(1).filter(r => r.length > 1).map(r => { const o: Record<string, string> = {}; header.forEach((h, i) => o[h] = (r[i] ?? '').trim()); return o; });
}

const TIER_MAP: Record<string, string> = { 'super elite': 't1', 'elite': 't2', 'standard': 't3', 'standard plus': 't4', 'progressive': 't5', 'fair': 't6' };
const tierKey = (l: string) => TIER_MAP[(l || '').trim().toLowerCase()] || null;
const num = (v: any) => { if (v == null || v === '') return 0; const n = parseFloat(String(v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
const lenderIsCaptive = (n: string) => /motor finance|financial services|financial|motor credit/i.test(n || '');

// ---- rich 'incentives' string parser (shared with import_lease_grid.ts) ----
// ';'-separated "Name $Amount [marker]" items. [applied] = baked into the advertised
// payment (these SUM to incentive_total) -> auto-applied. [cond: ...] = available rebate,
// NOT in the advertised payment -> customer-selectable. Robust to commas in amounts.
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

// Clean display name for the auto-applied OEM_CASH: the '[applied]' item names only.
function appliedName(raw: string, fallback: string): string {
  const applied = parseIncentives(raw).filter(i => i.applied).map(i => i.name);
  return applied.length ? applied.join(' + ') : fallback;
}

// Map a rebate name to a DB incentive type. Non-'OEM_CASH' types are selectable (isDefault=false).
function incentiveTypeByName(name: string): string {
  const n = (name || '').toLowerCase();
  if (n.includes('college grad')) return 'college';
  if (n.includes('first responder')) return 'first_responder';
  if (n.includes('military')) return 'military';
  return 'other';
}

async function main() {
  const text = fs.readFileSync(csvPath, 'utf8');
  const rows = parseCsv(text);
  const makeName = argMake || rows[0]?.make;
  const yearDefault = argYear || num(rows[0]?.year) || new Date().getFullYear();
  console.log(`Finance grid: ${rows.length} rows, make ${makeName}, year ${yearDefault}`);

  const lenderCounts: Record<string, number> = {};
  for (const r of rows) { const l = r.lender?.trim(); if (l) lenderCounts[l] = (lenderCounts[l] || 0) + 1; }
  const lenderName = Object.entries(lenderCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || `${makeName} Financial Services`;
  const lender = await prisma.lender.upsert({
    where: { name: lenderName },
    update: { isActive: true },
    create: { name: lenderName, isActive: true, isCaptive: lenderIsCaptive(lenderName), lenderType: lenderIsCaptive(lenderName) ? 'CAPTIVE' : 'NATIONAL_BANK', priority: 1 },
  });
  console.log(`Lender: ${lender.name}`);

  let nFin = 0, nInc = 0;

  // Pass 1 (in-memory): for each (trim,term,tier) keep the LOWEST-APR program — some
  // EVs list two offers (e.g. 0% APR + small cash vs higher APR + big cash); the best
  // advertised rate is the low-APR one. Also keep the incentive from that best-rate row.
  type Prog = { model: string; trim: string; term: number; tk: string; year: number; apr: number; incAmount: number; incName: string; incRaw: string };
  const best = new Map<string, Prog>();
  for (const r of rows) {
    if ((r.make || '').toLowerCase() !== makeName.toLowerCase()) continue;
    const model = r.model?.trim(), trim = r.trim?.trim();
    const term = num(r.term), tk = tierKey(r.credit_tier);
    const apr = num(r.apr), year = num(r.year) || yearDefault;
    // Allow 0% APR — subvented low-APR specials are valid (and usually the best) offers.
    // Only skip rows with no real offer (no monthly payment / amount financed).
    if (!model || !trim || !term || !tk) continue;
    if (num(r.monthly_payment) <= 0 && num(r.amount_financed) <= 0) continue;
    const k = `${model}|${trim}|${term}|${tk}`;
    const incName = appliedName(r.incentives, 'Customer Cash');
    // Carry the raw incentives string so Pass 2 can parse out the selectable '[cond:]' rebates.
    const cand: Prog = { model, trim, term, tk, year, apr, incAmount: num(r.incentive_total), incName, incRaw: r.incentives || '' };
    const cur = best.get(k);
    if (!cur || cand.apr < cur.apr) best.set(k, cand);
  }

  // Pass 2: upsert FinanceProgram + the best-rate row's incentive (per trim/term).
  const seenInc = new Set<string>();
  for (const p of best.values()) {
    await prisma.financeProgram.upsert({
      where: { lenderId_make_model_trim_year_term_internalLenderTier: { lenderId: lender.id, make: makeName, model: p.model, trim: p.trim, year: p.year, term: p.term, internalLenderTier: p.tk } },
      update: { buyRateApr: p.apr, isActive: true, status: 'PUBLISHED' },
      create: { lenderId: lender.id, make: makeName, model: p.model, trim: p.trim, year: p.year, term: p.term, internalLenderTier: p.tk, buyRateApr: p.apr, isActive: true, status: 'PUBLISHED' },
    });
    nFin++;

    // Finance incentives once per (trim,term), from the chosen (lowest-APR) program.
    // Scoped dealApplicability FINANCE with its own seedKey so it never collides with
    // the lease incentive — the engine applies the right one per quote type.
    const incKey = `${p.model}|${p.trim}|${p.term}`;
    if (p.tk === 't1' && !seenInc.has(incKey)) {
      seenInc.add(incKey);

      // Per the client: manufacturer customer/bonus cash (HMA Retail Bonus Cash, Dealer
      // Choice Bonus Cash, etc.) auto-applies for everyone on finance — like HMF Special
      // Lease does on lease. Eligibility programs (College Grad / First Responders /
      // Military) stay opt-in. "Low APR Special" is a rate, already in the FinanceProgram
      // APR, so it is NOT also counted as cash.
      // All auto-applied cash for one (trim,term) shares ONE exclusive group, so multiple
      // bonus-cash offers do NOT stack — the single highest applies (matches IncentiveResolver
      // and the catalog sumFor).
      const finCashGroup = `${makeName}_${p.model}_${p.trim}_${p.term}_fincash`.toLowerCase();
      for (const item of parseIncentives(p.incRaw)) {
        if (item.amount <= 0) continue;
        const nameL = item.name.toLowerCase();
        if (/low apr/.test(nameL)) continue; // rate special, already reflected in buyRateApr
        const eligibility = /college|grad|first responder|military|responder/.test(nameL);
        if (eligibility) {
          // opt-in selectable rebate (NOT OEM_CASH -> DataResolver isDefault=false)
          const optSeed = `gridinc-fin-opt:${makeName}:${p.model}:${p.trim}:${p.term}:${item.name}`.toLowerCase().replace(/\s+/g, '-');
          await prisma.oemIncentiveProgram.upsert({
            where: { seedKey: optSeed },
            update: { name: item.name, amountCents: Math.round(item.amount * 100), trim: p.trim, type: incentiveTypeByName(item.name), eligibilityRules: { terms: [p.term] }, isActive: true, status: 'PUBLISHED' },
            create: {
              seedKey: optSeed, name: item.name, amountCents: Math.round(item.amount * 100),
              type: incentiveTypeByName(item.name), dealApplicability: 'FINANCE', isTaxableCa: false,
              make: makeName, model: p.model, trim: p.trim,
              eligibilityRules: { terms: [p.term] }, stackable: true, isActive: true, status: 'PUBLISHED',
            },
          });
        } else {
          // broad manufacturer cash -> auto-applied OEM_CASH in the shared exclusive group
          const cashSeed = `gridinc-fin:${makeName}:${p.model}:${p.trim}:${p.term}:${item.name}`.toLowerCase().replace(/\s+/g, '-');
          await prisma.oemIncentiveProgram.upsert({
            where: { seedKey: cashSeed },
            update: { name: item.name, amountCents: Math.round(item.amount * 100), trim: p.trim, type: 'OEM_CASH', exclusiveGroupId: finCashGroup, eligibilityRules: { terms: [p.term] }, isActive: true, status: 'PUBLISHED' },
            create: {
              seedKey: cashSeed, name: item.name, amountCents: Math.round(item.amount * 100),
              type: 'OEM_CASH', dealApplicability: 'FINANCE', isTaxableCa: false,
              exclusiveGroupId: finCashGroup,
              make: makeName, model: p.model, trim: p.trim,
              eligibilityRules: { terms: [p.term] }, stackable: true, isActive: true, status: 'PUBLISHED',
            },
          });
        }
        nInc++;
      }
    }
  }
  console.log(`Done. financePrograms=${nFin}, finance-term incentives upserted=${nInc}`);
}

main().catch(e => { console.error('FINANCE IMPORT FAILED:', e); process.exit(1); }).finally(() => prisma.$disconnect());
