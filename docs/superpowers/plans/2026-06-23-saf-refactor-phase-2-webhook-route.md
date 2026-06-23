# SAF Refactor Phase 2 Webhook Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss webhook의 `DONE` order promotion을 shared payment lifecycle helper로 이전한다.

**Architecture:** `STATUS_CHANGED DONE` 안전망 branch를 먼저 `markOrderPaidWithOutcome()`으로 이동하고, 이후 `DEPOSIT_CALLBACK DONE` branch를 같은 패턴으로 이동한다. webhook route는 verified Toss event, already-cancelled refund scheduling, branch-specific buyer/admin notifications만 담당한다.

**Tech Stack:** Next.js App Router Route Handler, Supabase JS v2 mock, TossPayments webhook payload, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- `cancelled` / `refunded` 주문은 절대 paid로 승격하지 않는다.
- `ARTWORK_TAKEN` 자동 환불과 buyer notification 보류 의미를 유지한다.
- webhook `200 ack` / `500 retry` 의미를 기존 테스트가 보장하는 범위에서 유지한다.
- `content/changelog.json`, `lib/site-stats.ts`는 범위 밖이다.
- TDD: branch별 source contract RED를 먼저 확인한다.

---

## File Structure

- Modify: `app/api/webhooks/toss/route.ts`
  - Import `markOrderPaidWithOutcome()`.
  - Migrate `PAYMENT_STATUS_CHANGED DONE` branch first.
  - Migrate `DEPOSIT_CALLBACK DONE` branch second.
- Modify Test: `__tests__/app/toss-webhook-status-changed-missing-payment.test.ts`
  - Source contract for `STATUS_CHANGED DONE` branch.
- Modify Test: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - Source contract for `DEPOSIT_CALLBACK DONE` branch.

---

### Task 1: STATUS_CHANGED DONE branch migration

- [x] **Step 1: source contract RED 추가**

Add a source-level guard that slices from `// PAYMENT_STATUS_CHANGED DONE` and checks for `markOrderPaidWithOutcome({` and no direct `recordOrderArtworkSales(` in that branch.

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-webhook-status-changed-missing-payment.test.ts -t "shared lifecycle"
```

Expected: FAIL because branch still calls `recordOrderArtworkSales()`.

- [x] **Step 3: route migration**

Use `markOrderPaidWithOutcome()` with:

```ts
sourceStatuses: ['pending_payment', 'awaiting_deposit'],
idempotencyKey: `webhook-status-${paymentKey}`,
continueOnSalesRecordFailure: true,
metadataPatch: { payment_method: verified.method ?? null, webhook_repaired: true },
```

Map `ARTWORK_TAKEN` to the existing auto-refund branch and map warnings to existing error notifications.

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-cancelled-done-source.test.ts
```

Expected: PASS.

---

### Task 2: DEPOSIT_CALLBACK DONE branch migration

- [x] **Step 1: source contract RED 추가**

Add a source-level guard that slices from `if (payload.data.paymentStatus === 'DONE')` inside the deposit callback block and checks for `markOrderPaidWithOutcome({`.

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts -t "shared lifecycle"
```

Expected: FAIL until the deposit branch uses shared lifecycle.

- [x] **Step 3: route migration**

Use `markOrderPaidWithOutcome()` with:

```ts
sourceStatuses: ['awaiting_deposit'],
idempotencyKey: `webhook-deposit-${paymentKey}`,
continueOnSalesRecordFailure: true,
metadataPatch: { payment_method: verified.method ?? null, webhook_repaired: true },
```

Keep deposit-confirmed notifications route-local and suppress them on `ARTWORK_TAKEN`.

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts
```

Expected: PASS.

---

### Task 3: verification

- [x] **Step 1: focused tests**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts __tests__/app/toss-webhook-cancelled-done-source.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts
```

Expected: PASS.

- [x] **Step 2: type-check, lint, diff check**

Run:

```bash
npm run type-check
npm run lint
git diff --check
```

Expected: exit 0 for all commands.

## Execution Status

2026-06-23 Phase 2 webhook route slice 완료:

- `PAYMENT_STATUS_CHANGED DONE` branch가 `markOrderPaidWithOutcome()` 사용
- `DEPOSIT_CALLBACK DONE` branch가 `markOrderPaidWithOutcome()` 사용
- cancelled/refunded order guard와 cancelled-order DONE 자동 취소 scheduling 유지
- `ARTWORK_TAKEN` 자동 환불, sales warning notification, deposit/payment confirmed notification 보존
- 검증: `npm test -- --runInBand __tests__/lib/commerce/checkout-session.test.ts __tests__/lib/commerce/bank-transfer.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/actions/checkout.test.ts __tests__/app/checkout-success-analytics.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/app/reconcile-payments-reservation-source.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts __tests__/app/toss-webhook-cancelled-done-source.test.ts`, `npm run type-check`, `npm run lint`, `git diff --check`

다음 단계:

- Phase 3: refund/cancel lifecycle 도입 (`refundOrder()`, `cancelBuyerOrder()`, awaiting-deposit cancel)
- webhook/confirm/reconcile에 남은 가상계좌 `WAITING_FOR_DEPOSIT` reservation branch는 별도 lifecycle로 추출
