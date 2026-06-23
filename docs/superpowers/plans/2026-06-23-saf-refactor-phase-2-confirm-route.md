# SAF Refactor Phase 2 Confirm Route Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss confirm route의 결제 완료(`DONE`) promotion을 shared payment lifecycle helper로 이전한다.

**Architecture:** `markOrderPaid()` boolean API는 reconcile 호환 wrapper로 유지하고, confirm/webhook adapter가 분기 정보를 잃지 않도록 structured outcome API를 추가한다. confirm route는 payment row, order paid 전이, sales 기록, artwork status sync, public cache revalidation을 shared helper에 맡기고, HTTP 응답/자동 환불/구매자 알림만 담당한다.

**Tech Stack:** Next.js App Router Route Handler, Supabase JS v2 mock, TossPayments response types, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: Toss 승인이 완료됐더라도 payment row, order paid 전이, sales 기록 실패를 성공으로 감추지 않는다.
- confirm route의 `artwork_taken` 자동 환불과 buyer/admin notification 의미를 유지한다.
- 가상계좌 `WAITING_FOR_DEPOSIT` 예약/취소 흐름은 이번 slice에서 이동하지 않는다.
- 기존 dirty files `content/changelog.json`, `lib/site-stats.ts`는 이번 작업 범위가 아니며 되돌리거나 섞지 않는다.
- TDD: production code 변경 전에 failing test 또는 source contract RED를 먼저 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Modify: `lib/commerce/payment-lifecycle/mark-order-paid.ts`
  - Add `markOrderPaidWithOutcome()` and structured result types.
  - Keep `markOrderPaid()` as the existing boolean/errors wrapper for reconcile.
- Modify Test: `__tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts`
  - Add outcome tests for `ARTWORK_TAKEN`, sales-record warning, and wrapper compatibility.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - Use `markOrderPaidWithOutcome()` for `DONE`.
  - Keep VA reservation branch local.
  - Keep confirm-specific auto-refund and notifications local.
- Modify Test: `__tests__/app/toss-confirm-payment-record-failure.test.ts`
  - Add source contract and preserve existing failure behavior.

---

### Task 1: structured mark-order-paid outcome

**Files:**

- Modify: `lib/commerce/payment-lifecycle/mark-order-paid.ts`
- Modify Test: `__tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts`

**Interfaces:**

- Produces:

```ts
export type MarkOrderPaidWarning =
  | { code: 'ARTWORK_SALES_FAILED'; error: string }
  | { code: 'NO_LINE_ITEMS' };

export type MarkOrderPaidOutcome =
  | { ok: true; salesLines: ArtworkSaleLine[]; warnings: MarkOrderPaidWarning[] }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }
  | { ok: false; code: 'ORDER_UPDATE_FAILED'; error: string }
  | { ok: false; code: 'ORDER_STATE_MISMATCH' }
  | { ok: false; code: 'ARTWORK_TAKEN'; salesLines: ArtworkSaleLine[] }
  | { ok: false; code: 'ARTWORK_SALES_FAILED'; error: string; salesLines: ArtworkSaleLine[] };

export type MarkOrderPaidWithOutcomeInput = MarkOrderPaidInput & {
  continueOnSalesRecordFailure?: boolean;
};

export async function markOrderPaidWithOutcome(
  input: MarkOrderPaidWithOutcomeInput
): Promise<MarkOrderPaidOutcome>;
```

- Consumes: existing `markOrderPaid(input): Promise<boolean>` remains available and keeps current reconcile semantics.

- [x] **Step 1: RED tests 추가**

Add tests:

```ts
it('returns an ARTWORK_TAKEN outcome with sales lines for caller-specific refund handling', async () => {
  const { markOrderPaidWithOutcome } = await import(
    '@/lib/commerce/payment-lifecycle/mark-order-paid'
  );
  const supabase = createSupabase();
  mockRecordOrderArtworkSales.mockResolvedValue({ inserted: false, reason: 'artwork_taken' });

  const result = await markOrderPaidWithOutcome({
    supabase: supabase.client as never,
    order: baseOrder,
    tossPayment: basePayment,
    provider: 'api_v1',
    now: '2026-06-23T00:00:00.000Z',
    sourceStatuses: ['pending_payment'],
    idempotencyKey: 'confirm-SAF-001',
    errors: [],
  });

  expect(result).toEqual({
    ok: false,
    code: 'ARTWORK_TAKEN',
    salesLines: [{ artwork_id: 'art-1', quantity: 1, unit_price: 100000 }],
  });
});

it('can continue after a sales-record failure while preserving a caller-visible warning', async () => {
  const { markOrderPaidWithOutcome } = await import(
    '@/lib/commerce/payment-lifecycle/mark-order-paid'
  );
  const supabase = createSupabase();
  mockRecordOrderArtworkSales.mockResolvedValue({
    inserted: false,
    reason: 'error',
    error: 'sales db down',
  });

  const result = await markOrderPaidWithOutcome({
    supabase: supabase.client as never,
    order: baseOrder,
    tossPayment: basePayment,
    provider: 'api_v1',
    now: '2026-06-23T00:00:00.000Z',
    sourceStatuses: ['pending_payment'],
    idempotencyKey: 'confirm-SAF-001',
    errors: [],
    continueOnSalesRecordFailure: true,
  });

  expect(result).toEqual(
    expect.objectContaining({
      ok: true,
      warnings: [{ code: 'ARTWORK_SALES_FAILED', error: 'sales db down' }],
    })
  );
  expect(mockDeriveAndSyncArtworkStatus).toHaveBeenCalledWith(supabase.client, 'art-1');
});
```

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts -t "ARTWORK_TAKEN|sales-record failure"
```

Expected: FAIL because `markOrderPaidWithOutcome` is not exported.

- [x] **Step 3: GREEN implementation**

Implement `markOrderPaidWithOutcome()` and make `markOrderPaid()` call it. The wrapper pushes the existing error strings for `PAYMENT_RECORD_FAILED`, `ORDER_UPDATE_FAILED`, `ARTWORK_TAKEN`, and fatal `ARTWORK_SALES_FAILED`, returns `false` for `ORDER_STATE_MISMATCH`, and returns `true` for `ok`.

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts
```

Expected: PASS.

---

### Task 2: confirm route DONE branch migration

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify Test: `__tests__/app/toss-confirm-payment-record-failure.test.ts`

**Interfaces:**

- Consumes: `markOrderPaidWithOutcome(input): Promise<MarkOrderPaidOutcome>`
- Produces: confirm route imports `@/lib/commerce/payment-lifecycle/mark-order-paid` and no longer calls `recordOrderArtworkSales()` directly.

- [x] **Step 1: source contract RED test 추가**

Add:

```ts
import { readFileSync } from 'node:fs';

it('routes Toss DONE promotion through the shared payment lifecycle helper', () => {
  const source = readFileSync('app/api/payments/toss/confirm/route.ts', 'utf8');

  expect(source).toContain('@/lib/commerce/payment-lifecycle/mark-order-paid');
  expect(source).toContain('markOrderPaidWithOutcome({');
  expect(source).not.toContain('recordOrderArtworkSales(supabase');
});
```

- [x] **Step 2: RED 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts -t "shared payment lifecycle"
```

Expected: FAIL because confirm route still records sales locally.

- [x] **Step 3: route migration**

For `isDone`, call:

```ts
const paidOutcome = await markOrderPaidWithOutcome({
  supabase,
  order,
  tossPayment: tossResponse,
  provider,
  now: new Date().toISOString(),
  sourceStatuses: ['pending_payment'],
  idempotencyKey,
  errors: [],
  continueOnSalesRecordFailure: true,
});
```

Map outcomes:

- `PAYMENT_RECORD_FAILED`: existing 500 payment-record-failure response and notifications.
- `ORDER_UPDATE_FAILED` / `ORDER_STATE_MISMATCH`: existing order-status-sync failure handling.
- `ARTWORK_TAKEN`: existing automatic refund branch.
- `ARTWORK_SALES_FAILED` warning: existing sales failure notification, then continue success.

Keep the current `WAITING_FOR_DEPOSIT` payment-row and reservation branch unchanged.

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/checkout-success-analytics.test.ts
```

Expected: PASS.

---

### Task 3: verification

**Files:**

- Modify: `docs/superpowers/plans/2026-06-23-saf-refactor-phase-2-confirm-route.md`

- [x] **Step 1: focused tests**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/checkout-success-analytics.test.ts
```

Expected: PASS.

- [x] **Step 2: type-check**

Run:

```bash
npm run type-check
```

Expected: exit 0.

- [x] **Step 3: lint and diff check**

Run:

```bash
npm run lint
git diff --check
```

Expected: exit 0 for both commands.

## Execution Status

2026-06-23 Phase 2 confirm route slice 완료:

- `markOrderPaidWithOutcome()` structured lifecycle outcome 도입
- 기존 `markOrderPaid()`는 reconcile 호환 boolean wrapper로 유지
- Toss confirm route의 `DONE` promotion path가 shared payment lifecycle 사용
- confirm-specific `ARTWORK_TAKEN` 자동 환불, zero-row 자동 환불, sales warning notification 유지
- `WAITING_FOR_DEPOSIT` 가상계좌 예약/취소 흐름은 route-local로 유지
- 검증: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/checkout-success-analytics.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/reconcile-payments-missing-payment-source.test.ts __tests__/app/reconcile-payments-reservation-source.test.ts`, `npm run type-check`, `npm run lint`, `git diff --check`

다음 단계:

- Toss webhook `DEPOSIT_CALLBACK` / `STATUS_CHANGED DONE` branch를 `markOrderPaidWithOutcome()`으로 이전
- 이후 `ensureTossPaymentRecord()` 직접 호출이 남는 route-local branch를 가상계좌 lifecycle로 별도 추출
