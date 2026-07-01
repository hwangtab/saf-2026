# SAF Refactor Phase 3 Refund Cancel Lifecycle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 환불, 구매자 셀프 취소, 입금대기 취소가 같은 환불/취소 lifecycle 계약을 사용하게 만들어 Toss 취소 결과와 내부 DB sync 결과를 분리한다.

**Architecture:** `app/actions/admin-orders.ts`와 `app/actions/order-lookup.ts`는 인증, rate limit, request/result mapping만 담당하고, 환불/취소 이후 주문/결제/판매/작품/예약 상태 전이는 `lib/commerce/refund-cancel` 도메인 함수로 이동한다. 첫 구현 단위는 Toss 취소 성공 이후 내부 `refunded` 동기화이며, 이후 입금대기 취소와 알림/audit side effect를 같은 패턴으로 줄인다.

**Tech Stack:** Next.js App Router Server Actions, Supabase JS v2 mock, Jest, TypeScript.

## Execution Status

2026-06-30 시작:

- 깨끗한 worktree: `/Users/hwang-gyeongha/saf-2026/.worktrees/refactor-phase-3-refund-cancel`
- 브랜치: `codex/refactor-phase-3-refund-cancel`
- 기준 검증: `npm test -- --runInBand __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts` 통과

2026-06-30 Phase 3 핵심 slice 완료:

- `markOrderRefundedAfterCancel(...)` 도입 및 `refundOrder()`, `cancelBuyerOrder()` paid branch 연결
- `cancelAwaitingDepositOrder(...)` 도입 및 관리자/구매자 입금대기 취소 branch 연결
- `deriveAndSyncArtworkStatus(...)`를 `lib/artworks/status.ts`로 이동하고 admin action은 re-export adapter로 유지
- `lib/commerce`에서 `@/app/*` import를 금지하는 layer-boundary test 추가
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run type-check`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- `AGENTS.md`: 복잡한 작업은 `implementation_plan.md` 또는 계획 문서와 `task.md` 체크리스트로 추적한다.
- 운영 의도: 기술적 shortcut보다 운영자가 기대하는 결제/주문 최종 상태를 기준으로 구조화한다.
- 환불 불변조건: Toss 취소가 성공했는데 내부 주문/결제/매출 상태 반영이 실패하면 조용히 성공 처리하지 않고 운영자에게 복구 가능한 증거를 남긴다.
- 예약 불변조건: `order_items`가 주문-작품 truth이며, legacy `orders.artwork_id`는 fallback으로만 사용한다.
- 예약 해제는 반드시 `releaseReservedArtworksIfUnowned(...)`를 경유한다.
- TDD: production code 변경 전에 관련 failing test를 먼저 추가하거나 기존 source-contract test가 실패하는 것을 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 Phase 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/refund-cancel/mark-order-refunded.ts`
  - Toss 취소 성공 이후 내부 payment/order sync, active `artwork_sales` void, 작품 상태 재계산, 예약 해제, public artwork cache 갱신을 담당한다.
- Create Test: `__tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts`
  - success, payment update warning, order zero-row mismatch, order update error, sales void warning, reservation release warning을 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `refundOrder()`와 `updateOrderStatus(..., 'cancelled')`의 중복 후처리를 도메인 함수로 이전한다.
- Modify: `app/actions/order-lookup.ts`
  - `cancelBuyerOrder()`의 paid 취소 후처리를 도메인 함수로 이전한다.
- Modify Test: `__tests__/actions/admin-orders.test.ts`
  - 관리자 환불이 shared lifecycle을 사용하고 기존 `ORDER_REFUND_SYNC_FAILED` 운영 알림을 유지하는지 검증한다.
- Modify Test: `__tests__/actions/order-lookup.test.ts`
  - 구매자 paid 셀프 취소가 shared lifecycle을 사용하고 `ORDER_CANCEL_FAILED` 운영 알림을 유지하는지 검증한다.

---

### Task 1: `markOrderRefundedAfterCancel` 도메인 함수 도입

**Files:**

- Create: `lib/commerce/refund-cancel/mark-order-refunded.ts`
- Create Test: `__tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts`

**Interfaces:**

- Consumes: `extractLineItems(order): ArtworkSaleLine[]`
- Consumes: `deriveAndSyncArtworkStatus(supabase, artworkId): Promise<'available' | 'sold' | 'reserved'>`
- Consumes: `releaseReservedArtworksIfUnowned(supabase, artworkIds, now): Promise<ReleaseReservedArtworksResult>`
- Produces: `type RefundedOrderLifecycleOrder`
- Produces: `type RefundedOrderLifecyclePayment`
- Produces: `type MarkOrderRefundedAfterCancelInput`
- Produces: `type MarkOrderRefundedAfterCancelOutcome`
- Produces: `markOrderRefundedAfterCancel(input): Promise<MarkOrderRefundedAfterCancelOutcome>`

Expected function signature:

```ts
export async function markOrderRefundedAfterCancel(
  input: MarkOrderRefundedAfterCancelInput
): Promise<MarkOrderRefundedAfterCancelOutcome>;
```

Expected result contract:

```ts
type MarkOrderRefundedAfterCancelOutcome =
  | { ok: true; artworkIds: string[]; warnings: MarkOrderRefundedWarning[] }
  | { ok: false; code: 'ORDER_UPDATE_FAILED'; error: string }
  | { ok: false; code: 'ORDER_STATE_MISMATCH' };
```

- [x] **Step 1: RED success-path test 추가**

Create `__tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts` with a test that imports `markOrderRefundedAfterCancel`, passes an order with two `order_items`, and expects:

- `payments.update({ status: 'CANCELED', cancelled_at: now })`
- `orders.update({ status: 'refunded', refunded_at: now })`
- `artwork_sales.update({ voided_at: now, void_reason })`
- `deriveAndSyncArtworkStatus` called once per artwork id
- `releaseReservedArtworksIfUnowned` called with both artwork ids
- `/artworks/:id`, `/en/artworks/:id`, and public artwork surfaces revalidated

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts
```

Expected: FAIL because the file/function does not exist.

- [x] **Step 2: RED zero-row order update test 추가**

Add a test where the `orders.update(...).select('id')` result is `{ data: [], error: null }`.

Expected assertions:

- result is `{ ok: false, code: 'ORDER_STATE_MISMATCH' }`
- `artwork_sales.update` is not called
- `deriveAndSyncArtworkStatus` is not called
- `releaseReservedArtworksIfUnowned` is not called

Run the same targeted test command.

Expected: FAIL until the helper implements zero-row handling.

- [x] **Step 3: GREEN 최소 구현**

Create `lib/commerce/refund-cancel/mark-order-refunded.ts` and implement only the behavior covered by Steps 1-2.

- [x] **Step 4: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts
```

Expected: PASS.

---

### Task 2: 관리자 `refundOrder()`를 shared lifecycle에 연결

**Files:**

- Modify: `app/actions/admin-orders.ts`
- Modify Test: `__tests__/actions/admin-orders.test.ts`

**Interfaces:**

- Consumes: `markOrderRefundedAfterCancel(...)`
- Preserves: Toss cancel failure returns the existing thrown `TossPayments 취소 실패: ...`
- Preserves: internal order sync failure returns `{ success: false, error: 'ORDER_REFUND_SYNC_FAILED' }`
- Preserves: final admin/buyer notifications and `order_refunded` audit log.

- [x] **Step 1: RED source-contract test 추가**

Add a test that reads `app/actions/admin-orders.ts`, slices the `refundOrder` function, and expects:

- `markOrderRefundedAfterCancel({` appears
- direct `.from('artwork_sales')` does not appear in the `refundOrder` slice
- direct `deriveAndSyncArtworkStatus(` does not appear in the `refundOrder` slice

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-orders.test.ts -t "refundOrder"
```

Expected: FAIL because `refundOrder()` still open-codes inventory sync.

- [x] **Step 2: route/action migration**

Replace the local payment/order/refund inventory sync block in `refundOrder()` with `markOrderRefundedAfterCancel(...)`. Map non-ok outcomes to the existing `ORDER_REFUND_SYNC_FAILED` notification/log path.

- [x] **Step 3: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/admin-orders.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts
```

Expected: PASS.

---

### Task 3: 구매자 `cancelBuyerOrder()` paid branch를 shared lifecycle에 연결

**Files:**

- Modify: `app/actions/order-lookup.ts`
- Modify Test: `__tests__/actions/order-lookup.test.ts`

**Interfaces:**

- Consumes: `markOrderRefundedAfterCancel(...)`
- Preserves: rate limit, ownership/email verification, Toss cancel error mapping.
- Preserves: internal order sync failure returns `{ success: false, error: 'ORDER_CANCEL_FAILED' }` and sends the existing operator alert.
- Preserves: buyer/admin refunded notifications and buyer audit log.

- [x] **Step 1: RED source-contract test 추가**

Add a test that reads `app/actions/order-lookup.ts`, slices the paid branch of `cancelBuyerOrder`, and expects:

- `markOrderRefundedAfterCancel({` appears
- direct `.from('artwork_sales')` does not appear after the paid Toss cancel branch starts
- direct `deriveAndSyncArtworkStatus(` does not appear after the paid Toss cancel branch starts

Run:

```bash
npm test -- --runInBand __tests__/actions/order-lookup.test.ts -t "cancelBuyerOrder"
```

Expected: FAIL because the paid branch still open-codes inventory sync.

- [x] **Step 2: action migration**

Replace the local payment/order/refund inventory sync block in the paid branch with `markOrderRefundedAfterCancel(...)`. Map non-ok outcomes to the existing `ORDER_CANCEL_FAILED` alert/log path.

- [x] **Step 3: GREEN 확인**

Run:

```bash
npm test -- --runInBand __tests__/actions/order-lookup.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts
```

Expected: PASS.

---

### Task 4: 입금대기 취소 lifecycle 분리

**Files:**

- Create: `lib/commerce/refund-cancel/cancel-awaiting-order.ts`
- Create Test: `__tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts`
- Modify: `app/actions/admin-orders.ts`
- Modify: `app/actions/order-lookup.ts`
- Modify Test: `__tests__/actions/admin-orders.test.ts`
- Modify Test: `__tests__/actions/order-lookup.test.ts`

**Interfaces:**

- Produces: `cancelAwaitingDepositOrder(...)` that changes `orders.status` from `awaiting_deposit` to `cancelled`, releases reserved artworks through `releaseReservedArtworksIfUnowned`, and revalidates public artwork surfaces.
- Preserves: 관리자 취소와 구매자 셀프 취소의 알림/audit wording.

- [x] **Step 1: RED domain test 추가**
- [x] **Step 2: GREEN domain helper 구현**
- [x] **Step 3: 관리자 `cancelAwaitingOrder()` 연결**
- [x] **Step 4: 구매자 `cancelBuyerOrder()` awaiting branch 연결**
- [x] **Step 5: targeted tests GREEN 확인**

---

### Task 5: Verification and handoff

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`

**Steps:**

- [x] **Step 1: focused Jest**

Run:

```bash
npm test -- --runInBand __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts
```

- [x] **Step 2: type/lint**

Run:

```bash
npm run type-check
npm run lint
git diff --check
```

- [x] **Step 3: documentation**

Update `task.md` and `walkthrough.md` with completed scope and verification evidence.
