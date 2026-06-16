---
name: ui-design
description: How to design and redesign UI for hunter-lease so it reads premium and uncluttered instead of amateur. Use for any hero, landing, page, or component layout/visual change. Encodes the project's REAL design tokens (Outfit + Inter, light theme, single mint accent), a concrete type scale and 8pt spacing system, the premium-hero playbook, the clutter antipatterns, a design-review checklist, a known light-theme contrast bug, and how to verify a visual change with screenshots.
---

# UI design for hunter-lease

Goal: every screen should read as **calm, confident, premium**. The audience's #1 fear is being
deceived; a cluttered or amateur layout itself reads as "not legitimate." Craft is a trust signal a
skeptic cannot fake-detect. The single most common failure here is **adding** instead of **removing**.

## The one idea: restraint
One focal point per view. One primary action. Subtract elements until removing the next one would lose
meaning. Fewer, larger, more confident elements beat many small hedging ones. Whitespace AROUND elements
is premium; whitespace BESIDE elements (a dead empty half) is a layout bug, never solved by adding copy.

## Design tokens (ground truth, from `src/index.css`)
Do not invent colors or fonts. Use these.
- Display / headlines: **Outfit** (`var(--font-display)`), weights 600-700.
- Body / UI: **Inter** (`var(--font-sans)`), weights 400-600. Mono: JetBrains Mono.
- Theme is **light only**: `--bg #FFFFFF`, text `--w #000000`, surfaces `--s1 #F9FAFB` / `--s2 #F3F4F6`,
  borders `--b1 #E5E7EB` / `--b2 #D1D5DB`, muted text `--mu #374151` / `--mu2 #4B5563`.
- The single accent is `--lime #22c997` (mint). `--primary #002C5F` (navy) and `--accent #E63946` (red)
  exist but are essentially unused; do not reintroduce them without a reason.

### Known bug to fix, not copy
`--w` is **black** (foreground), but some components use it as a button background with `text-black`
(`bg-[var(--w)] text-black`) -> black-on-black, invisible label. Seen on the ZIP modal "Подтвердить"
button and the credit-tier select. `.glass` is built for a dark theme (white/5 on white) and is nearly
invisible here. When you touch these, fix the pairing: a button is `bg-[var(--lime)] text-black` (or
`bg-black text-white`), never `bg-[var(--w)] text-black`. Brand accent mismatch to resolve: the logo/
favicon use `#13E0A3` while the site accent is `#22c997`; unify on one.

## Type scale (pick steps only from this)
Ratio ~1.2-1.25, 16px base. Eyebrow 13 / body 16 / lead 18 / 24 / 30 / 36 / 48 / 60 / 72 / 80.
Tighten as size grows (geometry, not taste):
- Display H1 (48-80px): line-height 1.0-1.05, letter-spacing -0.02 to -0.025em, weight 600-700.
- H2 (28-40px): line-height 1.1-1.15, tracking -0.015em.
- Body / subhead (16-18px Inter): line-height 1.5-1.6, tracking 0.
- Eyebrow (13px uppercase): line-height 1.2, tracking +0.06 to +0.08em.
Measure (max line length): headlines 13-16ch (~6-9 words); body/subhead 45-60 characters. Cap every text
block with a max-width. Max 4 weights total; build secondary hierarchy with **weight + gray**, not size.

## Spacing: 8pt grid
All gaps and paddings come from {4, 8, 12, 16, 24, 32, 48, 64, 96, 128}px. Group related items with
tighter gaps, separate units with wider ones (proximity). Section vertical padding 96-128px desktop.
Rule of thumb: take the gap that feels like enough, then add ~1.5x, round to the nearest 8.

## Color discipline
~85% white, ~10% black/gray text, ~5% mint. The accent marks exactly ONE thing per view (the CTA, and at
most one highlight word). If mint appears more than ~3 times above the fold, cut it back. No gradients on
the light theme. Never use mint for body text or as a fill across multiple elements.

## Hero playbook (this is the current pain; follow exactly)
Commit to the **Ramp shape**: a two-column hero, not a column-plus-void.
- **Layout:** 55/45 split on >=1280px. Left = text column (max-width ~560px, vertically centered).
  Right = ONE real product visual. Below ~1024px, stack to a single column with the visual under the CTA.
- **Element budget = 4** in the text column (5 is the absolute ceiling): optional eyebrow/trust line ->
  headline -> subhead -> CTA row. If a 5th block wants in, it goes below the hero, not in it.
- **Headline:** Outfit 700, `clamp(2.5rem, 1rem + 4.5vw, 4rem)` (~40px mobile, ~64-72px desktop),
  line-height 1.05, letter-spacing -0.02em, **max 2 lines / 6-9 words**, max-width ~14ch. Accent on
  **one word only** (or a 4px mint underline), the rest near-black. No two-tone across a whole line.
- **Subhead:** Inter 400, 18px, line-height 1.5, color `--mu2 #4B5563`, max-width ~46ch, <=2 lines. It
  states the mechanism ("dealers dump cars to hit quotas, we surface those deals") so the headline does
  not have to. This single line replaces both the old separate gray "mechanism" line and the long subtitle.
- **CTA:** one solid `--lime` button, height ~52px, padding 0 28px, label 16px/600, near-black text,
  radius 12-14px, concrete verb that signals the gain ("Узнать свою цену" / "Смотреть сделки"). Optional
  secondary as a quiet ghost/text-link with "->". Never two equal-weight buttons.
- **Trust as leverage, not rescue:** the license/SSN-honesty/$95-refundable proof is ONE quiet line under
  the CTA (13-14px gray, at most one small mint check), never a loud badge pill above the headline.
- **The right-column visual is a REAL product artifact:** a transparent lease+finance deal card showing
  the monthly + money-down breakdown, or a Hunter Score gauge with a real number, or a clean car render.
  It demonstrates the transparency promise instead of claiming it. No stock illustration, no blob, no
  placeholder.
- **Vertical rhythm:** eyebrow->H1 24, H1->subhead 24, subhead->CTA 36-40, CTA->trust line 16. Hero
  padding 96-128px top/bottom desktop. Vertically center the copy block against the visual.

## Clutter antipatterns (the amateur tells, avoid all)
- 5+ stacked text blocks competing for the eye; no single focal point.
- A headline that runs 3-4 lines (a paragraph cosplaying as a headline).
- A dead empty half on a wide desktop with no product visual.
- Two-tone / gradient headline where color is decorative (half a line colored, accent scattered).
- A loud trust/license badge above the headline (reads as defensive to a deception-averse audience).
- Two equal-weight primary CTAs; or a vague CTA label ("Подробнее", "Learn more").
- Off-grid, inconsistent gaps; default line-height (~1.4) and zero tracking on big display type.
- Accent used in 3+ places at once, so it no longer means "act here."
- Fabricated trust (fake VIN, "verified 2h ago", invented market average, urgency timer): triggers the
  #1 fear directly. Real-or-hidden, never fake.

## Design-review checklist (run before shipping any visual change)
1. Is there exactly one thing the eye lands on first, and one primary action?
2. Is the text-column element count <=4 (hero) and nothing competing with the headline?
3. Headline <=2 lines, <=9 words, tracking tightened, one accent word max?
4. Every text block capped with a max-width (headline ~14ch, body ~46-60ch)?
5. Every gap a value from the 8pt grid? Related items grouped, units separated?
6. Mint accent <=~10% of pixels, marking one CTA (+ at most one word)? No second accent, no gradient?
7. On >=1280px, is any large empty half filled with a real product visual (not padded with copy)?
8. Is trust expressed as one quiet verifiable line near the CTA, not a badge wall above the headline?
9. Does it frame relief as leverage/status, never rescue/fear? (Cross-check the onbrand-copy skill.)
10. No black-on-black / invisible elements (audit `bg-[var(--w)]`)? AA contrast on text and buttons?

## How to verify a visual change
1. Build/dev server, then screenshot the changed page at **1440x900** (desktop) and **390x844** (mobile),
   full page + above-the-fold.
2. The site shows two first-visit modals (language, then ZIP). Bypass them in the capture context with:
   `localStorage.setItem('language','ru')` and
   `localStorage.setItem('user-location-storage', JSON.stringify({state:{zipCode:'90210',hasConfirmedZip:true},version:0}))`
   (see `src/store/languageStore.ts` / `locationStore.ts`). Use Playwright `addInitScript`.
3. Read the screenshots and run the checklist above. A change is not done until both breakpoints pass.

## References to steal from (real, current)
- **Ramp** (ramp.com): the exact two-column shape we need: tight copy left, product dashboard right. No empty half.
- **Stripe** (stripe.com): 5-word headline carries the whole value prop; one CTA; real product UI; one accent.
- **Linear** (linear.app) / **Vercel** (vercel.com): near-monochrome, one sentence + one real visual, ruthless restraint, trust strip BELOW the hero.
- **Mercury** (mercury.com): legitimacy via craft and aspiration (status), not trust seals; one accent.
- **CarEdge** (caredge.com): quantify value in the headline ("Save $X"), real-customer proof, one primary + one text-link CTA. Direct category peer.
- **Leasehackr** (leasehackr.com): trust baked into one subline, single deal-oriented CTA. Direct SoCal lease competitor.
- Failure-mode data (100-hero study): 27% competing CTAs, 20% unclear value prop, 20% missing trust, 20% weak imagery, 7% clutter. Design against these.
