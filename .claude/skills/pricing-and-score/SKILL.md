---
name: pricing-and-score
description: How hunter-lease prices deals and computes the Hunter Score, and how to change either one safely. Use when working on the lease/finance calculator, the catalog price, money factor / residual / incentives / fees, the deposit amount, the Hunter Score, or any task where the catalog and calculator could disagree. Covers the engine map, the single-source-of-truth rule, the formula, and the read-only drift diagnostic.
---

# Pricing and Hunter Score

## The cardinal rule: catalog and calculator must agree
The same car must price identically in the catalog and the calculator. They diverged badly once
(stale carDb rates vs live programs); both now resolve from the same live grid. If you touch ANY
pricing input, prove they still agree before merging.

## Engine map (`server/services/engine/`)
- `PureMathEngine` — pure lease/finance math (MF, residual, cap cost, CA tax-on-payment, drive-off).
  Has golden-value tests; do not change outputs without updating `PureMathEngine.test.ts`.
- `DataResolver` — resolves vehicle, programs (LeaseProgram/FinanceProgram), incentives
  (OemIncentiveProgram), dealer discount (DealerAdjustment), and settings. Fuzzy trim matching.
- `DealEngineFacade` — `runPipeline` / `calculateForConsumer` = the CALCULATOR path;
  `mapCatalogDeals` = the CATALOG path. `server.ts` `mapDealsForFrontend` builds the card from `computed`.
- `feeResolver` — shared CA tax + DMV estimate (used by both paths so fees never diverge).

## Single source of truth (never hardcode money twice)
- Deposit: `SiteSettings.depositAmount` via `getDepositCents()` in server.ts. Frontend reads
  `settings.depositAmount`. To change $95 -> $200: edit the setting in admin, no code, no deploy.
- Fees / tax / MF / residual: resolve through the engine, never inline a literal in a component.

## Hunter Score (`server/services/engine/HunterScore.ts`)
One 0-100 number = how good the deal is vs the market.
```
LCR%        = monthly_payment / MSRP * 100
LCR_axis    = clamp( (2.4 - LCR%) / (2.4 - 0.8) * 100 , 0..100 )      # 0.8% -> 100, 2.4% -> 0
market_delta = (market_avg - monthly_payment) / market_avg
market_axis  = clamp( 50 + market_delta * 250 , 0..100 )             # 0% -> 50, +20% below -> 100
score        = round( 0.6*market_axis + 0.4*LCR_axis )               # = round(LCR_axis) if no real market_avg
bands        = >=85 Steal | 65-84 Strong | 50-64 Fair | <50 Above Market
```
GUARDRAIL: return `pending` (render NO badge) when MSRP/payment invalid or LCR < 0.6% (a payment that
low is almost always a data error — never show a fake high score). Use the REAL `marketAvg` only; never
the synthetic `payment * 1.267` fallback. Keep this in sync with the public page at `/hunter-score` and
`HunterScore.test.ts`. Score is lease-oriented today; finance scoring is a known follow-up.

## Prove no drift before merging a pricing change (read-only)
`DATABASE_URL` from `~/hunter-lease-v2/.env` (only authorized source; load without echoing the secret).
Run the read-only diagnostic that compares both engine paths for every active deal:
```
F="$HOME/hunter-lease-v2/.env"; export DATABASE_URL="$(grep -E '^DATABASE_URL=' "$F" | head -1 | cut -d= -f2- | sed -e 's/^["'"'"']//' -e 's/["'"'"']$//')"
npx tsx scripts/diagnose_path_drift.ts          # catalog vs calculator delta per deal; aim for ~$0
```
The database is READ-ONLY. Never mutate or delete it. Incremental one-path patches tend to backfire —
fix the shared resolver, not one side.
