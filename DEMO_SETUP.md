# Demo Environment Setup

## 1. Создать базу данных (Neon — бесплатно, 2 минуты)

1. Зайди на https://neon.tech → Sign up → New Project → имя: `hunter-lease-demo`
2. Скопируй строку подключения вида:
   ```
   postgresql://neondb_owner:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require
   ```

---

## 2. Создать `.env` файл в корне проекта

Создай файл `.env` рядом с `package.json` и вставь:

```env
# ── SERVER ────────────────────────────────────────────────
PORT=3000
NODE_ENV=development

# ── DATABASE (вставь строку из Neon) ──────────────────────
DATABASE_URL=postgresql://neondb_owner:PASSWORD@ep-xxx.us-east-2.aws.neon.tech/neondb?sslmode=require

# ── ADMIN BYPASS (Firebase не нужен для demo) ─────────────
ADMIN_SECRET=demo-secret-2024

# ── STRIPE (тестовые ключи клиента) ──────────────────────
STRIPE_SECRET_KEY=sk_test_YOUR_KEY_HERE
STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE
STRIPE_WEBHOOK_SECRET=whsec_test_placeholder

# ── 700CREDIT (sandbox — реальный ключ не нужен) ──────────
CREDIT_700_SANDBOX=true

# ── EMAIL (dry-run без credentials) ──────────────────────
# Оставь пустым — сервис будет работать в dry-run режиме

# ── FRONTEND ──────────────────────────────────────────────
FRONTEND_URL=http://localhost:3000
VITE_API_URL=http://localhost:3000
```

---

## 3. Запустить проект

```bash
npm install
npm run dev
```

При старте автоматически: `prisma db push` (создаст все таблицы) + `prisma generate`.

---

## 4. Прогон сценариев (curl)

### Авторизация: используй везде заголовок
```
Authorization: Bearer demo-secret-2024
```

---

### Сценарий 1 — Quote Flow (единый серверный расчёт)
```bash
curl -X POST http://localhost:3000/api/v2/quote \
  -H "Content-Type: application/json" \
  -d '{
    "vehicleId": "test-vehicle-001",
    "msrp": 45000,
    "salePrice": 43200,
    "residualPercent": 0.55,
    "moneyFactor": 0.00125,
    "term": 36,
    "downPayment": 0,
    "zipCode": "10001"
  }'
```
**Ожидаемый результат:** JSON с `monthlyPayment`, `capCost`, `residualValue`, `depreciation`, `rentCharge`

---

### Сценарий 2 — Stripe: создать сессию депозита $95
```bash
curl -X POST http://localhost:3000/api/stripe/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-secret-2024" \
  -d '{
    "leadId": "lead-demo-001",
    "customerEmail": "demo@test.com",
    "vehicleDescription": "2024 BMW 3 Series 330i"
  }'
```
**Ожидаемый результат:** `{ sessionId, sessionUrl, paymentId }` — ссылка ведёт на Stripe Checkout

---

### Сценарий 3 — 700Credit: consent + soft pull (sandbox)
```bash
# Шаг 1: Записать согласие
curl -X POST http://localhost:3000/api/credit/consent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-secret-2024" \
  -d '{ "leadId": "lead-demo-001" }'

# Шаг 2: Soft pull (вернёт mock score 720 / GOOD)
curl -X POST http://localhost:3000/api/credit/soft-pull \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-secret-2024" \
  -d '{
    "creditCheckId": "<id из шага 1>",
    "firstName": "John",
    "lastName": "Doe",
    "ssn": "000-00-0000",
    "dateOfBirth": "1985-06-15",
    "address": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  }'
```
**Ожидаемый результат:** `{ score: 720, creditBand: "GOOD", scoreRange: "700-749", ... }`

---

### Сценарий 4 — Dealer Assignment
```bash
# Назначить дилера на лид
curl -X POST http://localhost:3000/api/dealer/assign \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-secret-2024" \
  -d '{
    "leadId": "lead-demo-001",
    "dealerPartnerId": "<id дилера из БД>"
  }'

# Дилер принимает
curl -X POST http://localhost:3000/api/dealer/respond \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer demo-secret-2024" \
  -d '{
    "assignmentId": "<id из предыдущего запроса>",
    "action": "accept"
  }'
```

---

### Сценарий 5 — Program Batch: publish + rollback
```bash
# Publish batch
curl -X POST http://localhost:3000/api/admin/programs/batches/:id/publish \
  -H "Authorization: Bearer demo-secret-2024"

# Rollback
curl -X POST http://localhost:3000/api/admin/programs/batches/:id/rollback \
  -H "Authorization: Bearer demo-secret-2024"
```

---

## 5. Unit тест-кейсы (без сервера)

```bash
npm test
```

**Результат: 77/77 тестов — все зелёные**

| Файл | Сценарий | Тестов |
|------|----------|--------|
| 01-calculations.test.ts | PureMathEngine lease/finance + EligibilityEngine | 22 |
| 02-stripe.test.ts | Stripe checkout / webhook / refund | 10 |
| 03-credit.test.ts | 700Credit consent / soft-pull sandbox / band normalization | 18 |
| 04-dealer.test.ts | DealerAssignment create / accept / reject / counter / SLA | 13 |
| 05-notifications.test.ts | Email / SMS / templates / dry-run / logging | 8 |
| 06-program-batch.test.ts | ProgramBatch draft / publish / rollback / audit log | 6 |

---

## Важно

- **Firebase**: не нужен для demo — `ADMIN_SECRET` bypass авторизует как `SUPER_ADMIN`
- **700Credit**: работает в sandbox (`CREDIT_700_SANDBOX=true`), возвращает mock score 720
- **Email/SMS**: dry-run режим — логируется в таблицу `NotificationLog`, реальная отправка не происходит
- **Stripe**: тестовые ключи клиента, карта для теста: `4242 4242 4242 4242`, любой CVC и дата
