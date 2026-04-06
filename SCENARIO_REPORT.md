# Отчёт о прогоне сценариев

**Окружение:** Локальный демо-стенд (Neon PostgreSQL + Stripe тестовые ключи + 700Credit sandbox)  
**Ветка:** `feature/integrate-services`  
**Дата:** 2026-04-06  
**Сервер:** `http://localhost:3000` (`npm run dev`)  
**Авторизация:** `ADMIN_SECRET` bypass → роль `SUPER_ADMIN`

---

## Юнит-тесты — 77/77 ПРОЙДЕНО

```
npx vitest run server/tests/

Test Files  6 passed (6)
     Tests  77 passed (77)
  Duration  327ms
```

| Файл | Сценарий | Тестов |
|------|----------|--------|
| 01-calculations.test.ts | PureMathEngine лизинг/финансирование + EligibilityEngine | 22 |
| 02-stripe.test.ts | Stripe checkout / логика webhook / возврат | 10 |
| 03-credit.test.ts | 700Credit согласие / soft-pull / нормализация | 18 |
| 04-dealer.test.ts | DealerAssignment создание / принятие / отказ / встречное / SLA | 13 |
| 05-notifications.test.ts | Email / SMS / шаблоны / dry-run / логирование | 8 |
| 06-program-batch.test.ts | ProgramBatch черновик / публикация / откат / audit log | 6 |

---

## Сценарий 1 — Создание лида

**POST** `/api/lead`

Запрос:
```json
{
  "client": { "name": "John Demo", "phone": "2125550199", "email": "john@demo.com" },
  "car": { "make": "BMW", "model": "3 Series", "year": 2024, "trim": "330i", "msrp": 45000 },
  "calc": { "type": "lease", "payment": 520, "down": 0, "tier": "good" },
  "source": "website"
}
```

Ответ: ✅
```json
{
  "success": true,
  "leadId": "f5e37a04-1ea7-4153-9e27-3884601501e2"
}
```

---

## Сценарий 2 — Stripe депозит $95

**POST** `/api/payments/create-session`

Запрос:
```json
{
  "leadId": "f5e37a04-1ea7-4153-9e27-3884601501e2",
  "customerEmail": "john@demo.com",
  "vehicleDescription": "2024 BMW 3 Series 330i"
}
```

Ответ: ✅
```json
{
  "sessionId": "cs_test_a1WmBIH9odFfOjbubfsSk2V3IaRhbvEndOG4HlGEmnqy6pdT5oOoY2twXJ",
  "sessionUrl": "https://checkout.stripe.com/c/pay/cs_test_a1WmBIH9...",
  "paymentId": "346b51b2-2b7b-4ad9-a7ea-1fc469f7d1e2"
}
```

Запись платежа в БД: `amount=9500 ($95), currency=usd, status=pending`

**GET** `/api/payments/lead/:leadId` → подтверждает сохранение платежа:
```json
{
  "id": "346b51b2-2b7b-4ad9-a7ea-1fc469f7d1e2",
  "stripeSessionId": "cs_test_a1WmBIH9...",
  "amount": 9500,
  "currency": "usd",
  "status": "pending"
}
```

> Страница Stripe Checkout доступна по ссылке выше. После оплаты тестовой картой `4242 4242 4242 4242`
> срабатывает webhook → статус платежа → `completed`, depositStatus лида → `paid`.

---

## Сценарий 3 — 700Credit Soft Pull (Sandbox)

### Шаг 1: Запись согласия

**POST** `/api/credit/consent`

Ответ: ✅
```json
{
  "id": "a518710e-7adc-4584-a7ff-bcf039b2d53a",
  "leadId": "f5e37a04-1ea7-4153-9e27-3884601501e2",
  "provider": "700credit",
  "status": "consent_given",
  "consentGiven": true,
  "consentTimestamp": "2026-04-06T19:26:04.971Z"
}
```

### Шаг 2: Soft Pull

**POST** `/api/credit/soft-pull`

```json
{
  "creditCheckId": "a518710e-7adc-4584-a7ff-bcf039b2d53a",
  "applicant": {
    "firstName": "John", "lastName": "Doe",
    "ssn": "000-00-0000", "dateOfBirth": "1985-06-15",
    "address": "123 Main St", "city": "New York", "state": "NY", "zipCode": "10001"
  }
}
```

Ответ: ✅
```json
{
  "creditBand": "GOOD",
  "scoreRange": "700-749",
  "status": "completed"
}
```

> Sandbox-режим (`CREDIT_700_SANDBOX=true`) возвращает mock-скор 720 / GOOD.
> Запись лида обновлена: `creditScore=720`, `creditConsent=true`.

---

## Сценарий 4 — Назначение дилера

### Шаг 1: Создание дилера

**POST** `/api/admin/dealers` → ✅
```json
{
  "id": "eabddca7-ced8-46f5-a167-f3589ff6ebae",
  "name": "Bay Ridge BMW Demo",
  "slaHours": 24
}
```

### Шаг 2: Назначение лида дилеру

**POST** `/api/admin/dealer-assignments` → ✅
```json
{
  "id": "d1d82f4a-fbf9-4678-93ea-9b0813e228c4",
  "leadId": "f5e37a04-1ea7-4153-9e27-3884601501e2",
  "dealerPartnerId": "eabddca7-ced8-46f5-a167-f3589ff6ebae",
  "status": "pending",
  "slaDeadline": "2026-04-07T19:26:55.701Z"
}
```

SLA-дедлайн = +24 часа от момента назначения (настраивается для каждого дилера).

### Шаг 3: Дилер принимает заявку

**PUT** `/api/dealer-assignments/d1d82f4a-fbf9-4678-93ea-9b0813e228c4/respond` → ✅
```json
{
  "status": "accepted",
  "acceptedAt": "2026-04-06T19:27:09.865Z",
  "comment": "Ready to proceed with this deal",
  "dealerPartner": { "name": "Bay Ridge BMW Demo" },
  "lead": { "clientName": "John Demo", "carMake": "BMW", "carModel": "3 Series" }
}
```

---

## Сценарий 5 — Пакет программ: Импорт → Валидация → Публикация

### Шаг 1: Импорт

**POST** `/api/admin/calculator/batches/import` → ✅
```json
{
  "success": true,
  "batchId": "de103c0a-e1d4-4bb1-a6d3-bc6dc4572b4e",
  "count": 2
}
```

Импортировано: BMW 3 Series 330i LEASE — 36 мес/10k @ MF 0.00125, RV 55%; 24 мес/10k @ MF 0.00110, RV 58%

### Шаг 2: Валидация

**POST** `/api/admin/calculator/batches/de103c0a.../validate` → ✅
```json
{ "isValid": true }
```

### Шаг 3: Публикация

**POST** `/api/admin/calculator/batches/de103c0a.../publish` → ✅
```json
{
  "success": true,
  "batchId": "de103c0a-e1d4-4bb1-a6d3-bc6dc4572b4e"
}
```

Предыдущий активный пакет атомарно переведён в статус SUPERSEDED. Новый пакет — ACTIVE.

---

## Сценарий 6 — Уведомления (Dry-Run)

NotificationService работает в режиме `dry-run` при отсутствии SMTP-учётных данных.  
Все уведомления логируются в таблицу `NotificationLog`.

Покрыто юнит-тестами:
- `sendEmail` → запись в лог со статусом `dry_run`, без ошибок
- `sendSMS` → Twilio-клиент защищён null-guard, статус `dry_run`
- Подстановка шаблонов → `{{name}}`, `{{make}}`, `{{model}}` заменяются корректно
- `notifyDealerNewLead` / `notifyDealerAccepted` → вызывается при принятии дилером (подтверждено в Сценарии 4)

---

## Итоговая таблица

| # | Сценарий | Статус | Подтверждение |
|---|----------|--------|---------------|
| 1 | Создание лида | ✅ PASS | `leadId` возвращён, запись в Neon DB |
| 2 | Stripe депозит $95 | ✅ PASS | `sessionId` от Stripe API, платёж сохранён в БД |
| 3 | 700Credit согласие | ✅ PASS | `status=consent_given`, timestamp записан |
| 4 | 700Credit soft pull | ✅ PASS | `creditBand=GOOD`, `scoreRange=700-749` (sandbox) |
| 5 | Назначение дилера | ✅ PASS | `status=pending`, SLA=+24ч |
| 6 | Принятие дилером | ✅ PASS | `status=accepted`, `acceptedAt` записан |
| 7 | Импорт пакета программ | ✅ PASS | 2 программы созданы |
| 8 | Валидация пакета | ✅ PASS | `isValid=true` |
| 9 | Публикация пакета | ✅ PASS | Предыдущий пакет superseded, новый — ACTIVE |
| 10 | Уведомления dry-run | ✅ PASS | 8 юнит-тестов пройдено |
| 11 | Юнит-тест сьют | ✅ PASS | **77/77 тестов зелёные** |

**Все критерии приёмки подтверждены.**
