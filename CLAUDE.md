# hunter.lease — working agreement (read this first)

hunter.lease is a Southern California transparent new-car LEASE + FINANCE marketplace and
concierge. Stack: React 19 + Vite 6 + TypeScript + Tailwind + zustand (frontend);
Express + Node 24 + Prisma + PostgreSQL + Firebase + Stripe (backend, single `server.ts`).

These rules exist so work here is safe and correct by default. Follow them exactly.

## Golden rules (safety, non-negotiable)

1. **Never push to `main`. Never deploy to prod without the founder's explicit say-so.**
   The integration branch is `integrate-services`. Branch off it, PR back into it.
2. **Verify before every commit.** A change is not done until ALL pass:
   - `npx tsc --noEmit`  (type check; this is also the lint)
   - `npx vitest run`  (tests must be green; if a test was already failing on the base, say so)
   - `npx vite build`  (frontend bundles)
   - for `server.ts` / backend changes: `npx esbuild server.ts --bundle --platform=node --format=esm --packages=external --outfile=/tmp/srv.js`
3. **CI must be green before merge.** PRs run gitleaks (`scan`) + Semgrep. Wait for `scan:pass`
   and `semgrep:pass`. Merge with `gh pr merge <n> --merge`. CodeQL/Claude jobs are dormant
   (gated on `vars.ENABLE_CODEQL` / `vars.ENABLE_CLAUDE`) and skip — that is expected, not a failure.
4. **One source of truth for money.** Prices, fees, the money factor / residual, and the deposit
   amount must come from ONE place. Never hardcode an amount (e.g. `9500`, `$95`) in more than one
   spot. The deposit lives in `SiteSettings.depositAmount` via `getDepositCents()` in server.ts.
5. **Catalog and calculator must agree.** The same car must price identically in the catalog and the
   calculator. If you touch pricing, prove it with the drift diagnostic (see the pricing skill).
6. **Database: read-only.** Only run read-only diagnostics. `DATABASE_URL` comes from
   `~/hunter-lease-v2/.env` (the only authorized source); load it without echoing the secret. Never
   mutate or delete the database.
7. **SSN is REQUIRED.** Never write "no-SSN", "ITIN", or "99% approval" copy. The honest angle is
   "thin/new US credit, soft-pull first, co-signer helps" — not no-SSN.
8. **No em-dashes in copy, ever** (they read as insincere). All user-facing copy is bilingual EN + RU.
9. **Don't fabricate facts on the UI** (fake VIN, fake "verified 2h ago", invented market averages,
   fake urgency). For this audience a fabricated number triggers their #1 fear (being deceived).

## Architecture map (correctness)

- **Pricing engine** (`server/services/engine/`): `PureMathEngine` (lease/finance math),
  `DataResolver` (resolves vehicle/programs/incentives/dealer-discount/settings, fuzzy trim match),
  `DealEngineFacade` (`runPipeline`/`calculateForConsumer` = CALCULATOR; `mapCatalogDeals` = CATALOG).
  Catalog now prices from the same live grid the calculator uses.
- **Hunter Score** (`server/services/engine/HunterScore.ts`): one 0-100 deal-quality number.
  Market-delta axis (60%) + LCR axis (40%, payment/MSRP). Guardrail: `pending` (no badge) when
  MSRP/payment invalid or LCR < 0.6%. Public methodology page at `/hunter-score`. Shown on cards
  (`DealCard.tsx`), the deal page (`DealPage.tsx`), and sortable in the catalog.
- **Catalog vs components**: the real catalog page is `src/pages/DealsPage.tsx`. `DealCard.tsx` is
  the card component (used by Dashboard/SavedDeals and the homepage teaser via `DealsGrid`).
- **Deal funnel**: `DealPage` -> `DepositModal` -> (free soft-pull first when `VITE_SOFTPULL_FIRST=1`)
  -> Stripe deposit. The deposit is a refundable lock framed as "not a payment for a promise".
- **Tests**: vitest covers `HunterScore`, `EligibilityEngine`, `feeResolver`, `PureMathEngine`.

## Copy / brand (research-backed)

Audience leans Russian-speaking SoCal buyers (lease AND finance; they often prefer finance).
Their #1 fear is **обман** (being deceived and not even knowing it) — a wound to dignity, not just money.

- **Frame relief as leverage / status, never rescue.** Never "without us you'll be cheated / you'll
  lose / don't be a sucker" — a proud audience will go to the dealer to prove you wrong.
- Lead with a verifiable mechanism, not adjectives ("dealers dump cars to hit quotas, we catch those
  deals" beats "best prices!"). Show real numbers; this audience trusts checkable figures over hype.
- Pair "we speak your language" with checkable proof (the CA license badge, title in the buyer's name).
- Name our own deposit loudly and transparently (money-upfront is a top scam-reflex). Offer lease and
  finance as equals. No pressure/urgency timers.

Full fear map + do/don't lives in the on-brand-copy skill and in the founder's auto-memory.

**Russian must be NATIVE, not translated.** Translated-feeling Russian reads as foreign and triggers the
deception fear. Write Russian by thinking in Russian (draft it independently, not word-by-word from the
English): drop calqued "ваш/свой", kill канцелярит (verbs not -ние), keep the English terms the audience
actually lives in (SSN, lease, money factor, down, скор) but translate the trust/emotion words
(доверие, прозрачно, договор). Default to lowercase warm "вы". Full калька map + register + checklist
live in the **russian-copy skill** (`.claude/skills/russian-copy/`). No em-dashes anywhere, Russian
included (founder's call): write native RU that does not need тире (restructure, use commas/colons or "это").

## Design / UI

Every screen should read as **calm, confident, premium**: one focal point, one primary action, subtract
until it breaks. A cluttered layout itself reads as "not legitimate" to this audience. Use the real
tokens (Outfit + Inter, light theme, single mint `--lime #22c997`); never invent colors. Heads up: `--w`
is **black**, so `bg-[var(--w)] text-black` is invisible (a real bug to fix, not copy). Full type scale,
8pt spacing system, the premium-hero playbook, the clutter antipatterns, and a design-review checklist
live in the **ui-design skill** (`.claude/skills/ui-design/`). Verify any visual change with screenshots
at 1440 and 390 before shipping.

## How to ship a change here

Branch off `integrate-services` -> implement -> run the four verifications above -> commit (end the
message with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`) -> push -> open a PR into
`integrate-services` -> wait for `scan`+`semgrep` green -> `gh pr merge --merge`. If a background task
is editing the same working tree, work in an isolated `git worktree` to avoid colliding.
