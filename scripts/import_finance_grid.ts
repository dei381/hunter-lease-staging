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
  const seenIncByTrimTerm = new Set<string>();

  for (const r of rows) {
    if ((r.make || '').toLowerCase() !== makeName.toLowerCase()) continue;
    const model = r.model?.trim(), trim = r.trim?.trim();
    const term = num(r.term), tk = tierKey(r.credit_tier);
    const apr = num(r.apr), year = num(r.year) || yearDefault;
    if (!model || !trim || !term || !tk) continue;

    if (apr > 0) {
      await prisma.financeProgram.upsert({
        where: { lenderId_make_model_trim_year_term_internalLenderTier: { lenderId: lender.id, make: makeName, model, trim, year, term, internalLenderTier: tk } },
        update: { buyRateApr: apr, isActive: true, status: 'PUBLISHED' },
        create: { lenderId: lender.id, make: makeName, model, trim, year, term, internalLenderTier: tk, buyRateApr: apr, isActive: true, status: 'PUBLISHED' },
      });
      nFin++;
    }

    // Top up per-(trim,term) incentive (shared 'ALL' set). One per (trim,term).
    const key = `${model}|${trim}|${term}`;
    if (!seenIncByTrimTerm.has(key)) {
      seenIncByTrimTerm.add(key);
      const incAmount = num(r.incentive_total);
      if (incAmount > 0) {
        const incName = (r.incentives || '').replace(/\s*\$[\d,]+\s*$/, '').trim() || 'Customer Cash';
        const seedKey = `gridinc:${makeName}:${model}:${trim}:${term}`.toLowerCase();
        await prisma.oemIncentiveProgram.upsert({
          where: { seedKey },
          update: { type: 'OEM_CASH', eligibilityRules: { terms: [term] }, isActive: true, status: 'PUBLISHED' },
          create: {
            seedKey, name: incName, amountCents: Math.round(incAmount * 100),
            type: 'OEM_CASH', dealApplicability: 'ALL', isTaxableCa: false,
            exclusiveGroupId: `${makeName}_${model}_${trim}_INC`.toLowerCase(),
            make: makeName, model, trim, eligibilityRules: { terms: [term] },
            stackable: true, isActive: true, status: 'PUBLISHED',
          },
        });
        nInc++;
      }
    }
  }
  console.log(`Done. financePrograms=${nFin}, finance-term incentives upserted=${nInc}`);
}

main().catch(e => { console.error('FINANCE IMPORT FAILED:', e); process.exit(1); }).finally(() => prisma.$disconnect());
