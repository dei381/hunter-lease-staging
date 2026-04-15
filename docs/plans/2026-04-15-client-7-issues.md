# Client 7 Issues — Implementation Plan

> **For agentic workers:** Use subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve all 7 client-reported issues to bring the platform to production-ready state.

**Architecture:** Fix critical Payment model blocker first (Stripe), then expand data volume via MarketCheck bulk sync, add photo integration, align VehicleDetailPage with DealPage reference, verify CA calculator, and address production hardening.

**Tech Stack:** Prisma/Neon Postgres, Stripe SDK, MarketCheck API, Express, React/Vite, Firebase Auth

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Create | `prisma/migrations/add_payment_model/migration.sql` | Payment model for Stripe deposits |
| Modify | `prisma/schema.prisma` | Add Payment model, link to Lead |
| Modify | `server/services/StripeService.ts` | Fix Payment model references |
| Modify | `server/services/MarketcheckSyncService.ts` | Extract photo_links, bulk discovery |
| Modify | `server/routes/catalogRoutes.ts` | Use MarketCheck photos, expanded data |
| Modify | `src/pages/VehicleDetailPage.tsx` | Align with DealPage reference design |
| Modify | `src/components/Calculator.tsx` | Verify CA formula, add debug logging |
| Create | `server/utils/imageProxy.ts` | Proxy MarketCheck images + dealer blur |
| Modify | `server.ts` | Mount image proxy route, Stripe webhook fix |
| Modify | `.env` (Render dashboard) | STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET |

---

## Phase 1: Stripe Payment Model (Blocker)

### Task 1: Add Payment Model to Prisma Schema

**Files:**
- Modify: `prisma/schema.prisma`
- Modify: `server/services/StripeService.ts`
- Modify: `server.ts` (Stripe routes)

- [ ] **Step 1: Add Payment model to schema.prisma**

```prisma
model Payment {
  id                    String   @id @default(uuid())
  leadId                String?
  lead                  Lead?    @relation(fields: [leadId], references: [id])
  userId                String?
  quoteId               String?
  stripeSessionId       String?  @unique
  stripePaymentIntentId String?
  amountCents           Int
  currency              String   @default("usd")
  status                String   @default("pending") // pending, completed, expired, refunded
  refundedAt            DateTime?
  refundReason          String?
  metadata              String?  // JSON blob
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt

  @@index([leadId])
  @@index([stripeSessionId])
  @@index([status])
}
```

Also add `payments Payment[]` relation on Lead model.

- [ ] **Step 2: Run prisma db push**

```powershell
npx prisma db push --accept-data-loss
```
Expected: Payment table created in Neon.

- [ ] **Step 3: Fix StripeService.ts references**

Replace `prisma.payment.create()` calls to use correct field names (amountCents instead of amount). Verify webhook handler updates both Payment and Lead records.

- [ ] **Step 4: Verify Stripe routes in server.ts**

Check all `/api/payments/*` and `/api/stripe/webhook` routes for correct prisma.payment usage.

- [ ] **Step 5: Commit**

```powershell
git add prisma/schema.prisma server/services/StripeService.ts server.ts
git commit -m "feat: add Payment model for Stripe deposits"
```

### Task 2: Configure Stripe Environment

- [ ] **Step 1: Set Render env vars** (manual in dashboard)

```
STRIPE_SECRET_KEY=sk_test_... (get from client's Stripe dashboard)
STRIPE_PUBLISHABLE_KEY=pk_test_... (get from client)
STRIPE_WEBHOOK_SECRET=whsec_... (generate in Stripe dashboard → Webhooks)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_... (for frontend build)
```

- [ ] **Step 2: Update StripePaymentForm.tsx to use env var**

Replace hardcoded placeholder with `import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY`.

- [ ] **Step 3: Add Stripe webhook endpoint in Stripe Dashboard**

URL: `https://hunter-lease-staging.onrender.com/api/stripe/webhook`
Events: `checkout.session.completed`, `checkout.session.expired`

- [ ] **Step 4: Commit**

```powershell
git add src/components/StripePaymentForm.tsx
git commit -m "fix: use env var for Stripe publishable key"
```

---

## Phase 2: Data Volume — MarketCheck Bulk Sync

### Task 3: Expand MarketCheck Discovery for All Major Brands

**Files:**
- Modify: `server/services/MarketcheckSyncService.ts`
- Modify: admin sync endpoints in `server.ts`

**Goal:** Go from 8 vehicles to hundreds by syncing all popular makes.

- [ ] **Step 1: Add bulk discovery endpoint**

Add `POST /api/admin/sync-external/discover-all` that syncs ALL major brands:

```typescript
const DISCOVERY_MAKES = [
  'Toyota', 'Honda', 'Nissan', 'Hyundai', 'Kia',
  'BMW', 'Mercedes-Benz', 'Audi', 'Lexus', 'Acura',
  'Chevrolet', 'Ford', 'Jeep', 'Subaru', 'Mazda',
  'Volkswagen', 'Volvo', 'Genesis', 'Infiniti', 'Cadillac',
  'Lincoln', 'Buick', 'GMC', 'Ram', 'Dodge'
];
```

For each make: call MarketCheck search → extract unique models → create VehicleTrim entries with MSRP, MF, RV from aggregated listing data.

- [ ] **Step 2: Add batch bank program creation from MarketCheck data**

When MarketcheckSyncService discovers MF + RV for a trim, auto-create BankProgram entries so the trim becomes `status: 'ready'` in catalog.

- [ ] **Step 3: Add rate limiting to bulk discovery**

MarketCheck has API rate limits. Add 500ms delay between requests, retry with backoff on 429.

- [ ] **Step 4: Test bulk sync for 3 makes**

```powershell
$headers = @{ "x-admin-secret" = "demo-secret-2024"; "Content-Type" = "application/json" }
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/sync-external/discover-all" -Method POST -Headers $headers -Body '{"makes":["Toyota","Honda","Nissan"]}'
```
Expected: New VehicleTrim entries created, BankPrograms auto-generated.

- [ ] **Step 5: Commit**

```powershell
git add server/services/MarketcheckSyncService.ts server.ts
git commit -m "feat: bulk MarketCheck discovery for all major brands"
```

### Task 4: Extract & Store MarketCheck Photos

**Files:**
- Modify: `server/services/MarketcheckSyncService.ts`
- Create: `server/utils/imageProxy.ts`
- Modify: `server/routes/catalogRoutes.ts`
- Modify: `server.ts`

- [ ] **Step 1: Extract photo_links in MarketcheckSyncService**

In `extractListingData()`, add:
```typescript
const photoLinks = listing.media?.photo_links || [];
// Skip first photo (often has dealer branding), take up to 10
const cleanPhotos = photoLinks.slice(1, 11);
```

Store in VehicleTrim or SiteSettings `car_photos` JSON with `source: 'marketcheck'`.

- [ ] **Step 2: Create image proxy route**

```typescript
// server/utils/imageProxy.ts
// Proxy MarketCheck image URLs to avoid CORS and add caching
// GET /api/images/proxy?url=<encoded-marketcheck-url>
// Validates URL is from marketcheck domain, pipes response with cache headers
```

**Security:** Validate that proxied URL starts with `https://` and contains `marketcheck` or `cdn.` domain.

- [ ] **Step 3: Update catalogRoutes.ts photo matching**

Priority order for photos:
1. MarketCheck photos (from VehicleTrim.photoLinks JSON)
2. SiteSettings car_photos (manual uploads)
3. VehicleModel.imageUrl (generic brand photo)
4. Fallback placeholder

- [ ] **Step 4: Dealer data blur strategy**

Option A (recommended): Skip first photo from MarketCheck (usually has dealer plate).
Option B: Add CSS gradient overlay on bottom 15% of first image in frontend.

For MVP: use Option A (skip first photo). No server-side processing needed.

- [ ] **Step 5: Commit**

```powershell
git add server/services/MarketcheckSyncService.ts server/utils/imageProxy.ts server/routes/catalogRoutes.ts server.ts
git commit -m "feat: MarketCheck photo extraction with dealer skip"
```

---

## Phase 3: Calculator Verification (CA)

### Task 5: End-to-End Calculator Test for California

**Files:**
- Modify: `src/components/Calculator.tsx` (debug mode)
- Create: `test_ca_calculator.ts`

- [ ] **Step 1: Create CA calculator test script**

```typescript
// test_ca_calculator.ts
// Tests: 
// 1. Lease: 2025 BMW X5, MSRP $65,000, MF 0.00125, RV 58%, 36mo, $2000 down, ZIP 90210 (tax 9.5%)
//    Expected: ~$750-850/mo (depreciation + rent charge + 9.5% tax on payment)
// 2. Finance: same vehicle, APR 5.9%, 60mo, $5000 down
//    Expected: ~$1,150-1,250/mo
// 3. Edge: $0 down, no tax ZIP
// 4. Edge: high credit tier vs low tier (10bps MF markup)
```

Call `/api/v2/quote` with test parameters, verify response matches manual calculation.

- [ ] **Step 2: Manual formula verification**

For lease:
```
MSRP = $65,000
Selling Price = MSRP - Discount = $65,000
Residual = 58% × $65,000 = $37,700
Cap Cost = $65,000 + $695 (acq fee) - $2,000 (down) = $63,695
Depreciation = ($63,695 - $37,700) / 36 = $722.08/mo
Rent Charge = ($63,695 + $37,700) × 0.00125 = $126.74/mo
Base Payment = $722.08 + $126.74 = $848.82/mo
Tax = $848.82 × 0.095 = $80.64/mo
Monthly = $848.82 + $80.64 = $929.46/mo
```

- [ ] **Step 3: Compare backend vs manual calculation**

If mismatch > $5, investigate PureMathEngine.ts formula.

- [ ] **Step 4: Add CA-specific notes in Calculator UI**

Show tooltip: "California: sales tax is applied to monthly lease payment, not vehicle price"

- [ ] **Step 5: Commit**

```powershell
git add test_ca_calculator.ts src/components/Calculator.tsx
git commit -m "test: verify CA lease/finance calculator accuracy"
```

---

## Phase 4: Offer Page Alignment with DealPage

### Task 6: Add Missing DealPage Components to VehicleDetailPage

**Files:**
- Modify: `src/pages/VehicleDetailPage.tsx`

**Missing from VehicleDetailPage (present in DealPage):**
1. ❌ `ImageGallery` component (swipeable photo gallery)
2. ❌ Fuel Economy stats section
3. ❌ Owner Verdict section
4. ❌ Categorized Features tabs (Specs/Options)
5. ❌ `DealerReviews` component
6. ❌ `CaseStudies` component
7. ❌ `HappyClients` component
8. ❌ `SmartPriceAlertModal`
9. ❌ View count indicator
10. ❌ Countdown timer (urgency)
11. ❌ Mileage selector

- [ ] **Step 1: Add ImageGallery to VehicleDetailPage**

Import and render `ImageGallery` with photos from API response.
If no MarketCheck photos yet, show single image with placeholder.

- [ ] **Step 2: Add fuel economy section**

Use static fuel economy data based on make/model or fetch from API.
Show estimated annual fuel cost at CA gas prices ($4.50/gal).

- [ ] **Step 3: Add social proof sections**

Add `HappyClients`, `DealerReviews`, `CaseStudies` below FAQ.
These are generic components — work with static data.

- [ ] **Step 4: Add view count + urgency indicators**

```tsx
const [viewCount] = useState(Math.floor(Math.random() * 5) + 2);
// Show "X people viewing" badge
```

- [ ] **Step 5: Add SmartPriceAlertModal**

Import and wire up price alert modal (saves to Firebase).

- [ ] **Step 6: Add categorized features tabs**

If vehicle has features data, show Specs/Options tabs.
Fallback: show basic vehicle info (body style, drivetrain, engine).

- [ ] **Step 7: Build & test**

```powershell
npx vite build
```
Expected: Build succeeds.

- [ ] **Step 8: Commit**

```powershell
git add src/pages/VehicleDetailPage.tsx
git commit -m "feat: align VehicleDetailPage with DealPage reference design"
```

---

## Phase 5: Incentives Documentation

### Task 7: Document Incentives Flow for Client

**No code changes — documentation only.**

**How incentives work:**

1. **Data source:** `OemIncentiveProgram` table in Neon DB
2. **Fields:** name, amountCents, type (OEM_CASH, LOYALTY, MILITARY, COLLEGE, CONQUEST, FIRST_RESPONDER), make, model, trim, trimGroup, dealApplicability (ALL/LEASE/FINANCE), startDate, endDate, stackable
3. **Loading:** Seeded via `prisma/seed.ts` or admin API
4. **Matching:** `catalogRoutes.ts` fetches active incentives (where endDate > now), matches by make+model+trim
5. **Calculation:** Matched incentives reduce selling price → lower monthly payment
6. **Display:** VehicleDetailPage shows incentives list + amount saved, Calculator shows effective price

**To add new incentives:**
- Option A: Add to seed.ts and re-run `npx prisma db seed`
- Option B: Create admin API endpoint `POST /api/admin/incentives`
- Option C: Auto-extract from MarketCheck `listing.rebates` + `seller_comments`

**MarketCheck auto-extraction already implemented** in MarketcheckSyncService:
- Parses `seller_comments` for keywords: loyalty, military, college, conquest, first responder
- Maps to OemIncentiveProgram categories
- Creates entries during sync

---

## Phase 6: Production Hardening

### Task 8: Production Readiness Checklist

**Files:**
- Modify: `server.ts` (rate limiting, security headers)
- Modify: `prisma/schema.prisma` (Payment model from Task 1)

- [ ] **Step 1: Add rate limiting**

```powershell
npm install express-rate-limit
```

```typescript
import rateLimit from 'express-rate-limit';
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', apiLimiter);
```

- [ ] **Step 2: Add security headers**

```powershell
npm install helmet
```

```typescript
import helmet from 'helmet';
app.use(helmet());
```

- [ ] **Step 3: Add error monitoring placeholder**

Add Sentry or simple error logging middleware:
```typescript
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  // TODO: Add Sentry.captureException(err) when Sentry DSN is configured
  res.status(500).json({ error: 'Internal server error' });
});
```

- [ ] **Step 4: Verify Stripe webhook security**

Ensure `stripe.webhooks.constructEvent()` validates signature with `STRIPE_WEBHOOK_SECRET`.

- [ ] **Step 5: Review Firebase security rules**

Check `firestore.rules` and `storage.rules` for overly permissive access.

- [ ] **Step 6: Commit**

```powershell
git add server.ts package.json
git commit -m "feat: production hardening - rate limiting, security headers"
```

---

## Execution Order

| Priority | Task | Estimated Effort | Blocker? |
|----------|------|-----------------|----------|
| 🔴 P0 | Task 1: Payment model | 20 min | YES — Stripe broken |
| 🔴 P0 | Task 2: Stripe env config | 10 min (manual) | YES — need client keys |
| 🟠 P1 | Task 3: Bulk MarketCheck sync | 45 min | For data volume |
| 🟠 P1 | Task 4: MarketCheck photos | 30 min | For client Q1 |
| 🟡 P2 | Task 5: CA calculator test | 20 min | Verification |
| 🟡 P2 | Task 6: Offer page alignment | 40 min | UI parity |
| 🟢 P3 | Task 7: Incentives docs | 5 min | Info only |
| 🟢 P3 | Task 8: Production hardening | 25 min | For launch |

**Total estimated: ~3.5 hours of implementation**

---

## Dependencies

```
Task 1 (Payment model) → Task 2 (Stripe config) → Task 8 (webhook security)
Task 3 (Bulk sync) → Task 4 (Photos) → Task 6 (Offer page with gallery)
Task 5 (Calculator) — independent
Task 7 (Incentives docs) — independent
```

## Open Questions for Client

1. **Stripe keys**: Do you have a Stripe account? We need pk_test_/sk_test_ keys.
2. **Calculator broken**: What specific vehicle/scenario shows wrong numbers? Screenshot?
3. **Reference design**: Can you send a screenshot showing what the offer page should look like?
4. **Brands**: Which makes are priority for bulk sync? All 25 listed or a subset?
