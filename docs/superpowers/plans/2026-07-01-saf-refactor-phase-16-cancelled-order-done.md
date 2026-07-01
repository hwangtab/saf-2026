# SAF Refactor Phase 16 Cancelled Order DONE Compensation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss webhook route 안의 이미 취소된 주문에 대한 DONE 웹훅 자동취소 보상 흐름을 `lib/commerce/refund-cancel/cancelled-order-done.ts`로 이동한다.

**Architecture:** `handleCancelledOrderDoneRefund`는 취소된 SAF 주문에 결제 완료 웹훅이 도착했을 때 Toss cancel을 `after()`로 예약하고, 성공하면 `payments.status='CANCELED'`를 동기화하며, 성공/실패 모두 운영자 알림을 보낸다. webhook route는 주문 상태 guard와 200 ack 응답만 유지하고 helper에 payment/order/provider context를 전달한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Toss cancel integration mock, notification mocks, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 이미 취소된 주문에 DONE 웹훅이 도착하면 주문을 paid로 재승격하지 않고 외부 결제를 취소한다.
- 결제 불변조건: Toss cancel 성공 시 해당 `payments.id` row만 `CANCELED`로 동기화한다.
- 알림 불변조건: cancel 성공은 warning, cancel 실패는 error로 운영자에게 알리고 실패 시 수동 확인 문구를 유지한다.
- route 응답 불변조건: DEPOSIT_CALLBACK DONE과 STATUS_CHANGED DONE의 취소 주문 분기는 기존처럼 `cancelled_order_done_refund_scheduled` 200 ack를 반환한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/refund-cancel/cancelled-order-done.ts`
  - 취소 주문 DONE webhook 보상 helper와 관련 타입을 담당한다.
- Create Test: `__tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts`
  - Toss cancel 성공/실패, payment sync, 운영자 알림 payload를 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - local `handleDoneForAlreadyCancelledOrder`를 제거하고 shared helper를 호출한다.
- Modify: `__tests__/app/toss-webhook-cancelled-done-source.test.ts`
  - source contract가 helper import와 route branch guard를 확인하도록 조정한다.

---

## Execution Status

2026-07-01 cancelled-order DONE compensation slice 완료:

- [x] `__tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/refund-cancel/cancelled-order-done.ts` 구현
- [x] Toss webhook route DEPOSIT_CALLBACK/STATUS_CHANGED 취소 주문 DONE branch 연결
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: cancelled-order DONE helper 도입

- [x] **Step 1: RED helper tests 추가**
  - 성공 케이스: `cancelPayment(paymentKey, { cancelReason: '이미 취소된 주문에 결제 완료 웹훅 수신 — 자동 취소' }, 'auto-refund-cancelled-${orderNo}', provider)` 호출, `payments.id` 기준 CANCELED sync, warning 운영자 알림을 검증한다.
  - 실패 케이스: Toss cancel 실패 시 payment update를 하지 않고 error 운영자 알림과 수동 확인 문구를 검증한다.
- [x] **Step 2: RED 실패 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts`
  - Expected: module not found 또는 exported function missing.
- [x] **Step 3: helper 최소 구현**
  - `handleCancelledOrderDoneRefund(input): void`를 export한다.
  - helper 내부에서 `after(async () => { ... })`로 Toss cancel/payment sync/notification을 실행한다.
- [x] **Step 4: helper tests GREEN 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

- [x] **Step 1: route import 교체**
  - `app/api/webhooks/toss/route.ts`에 `handleCancelledOrderDoneRefund` import를 추가한다.
  - local `handleDoneForAlreadyCancelledOrder` 함수와 helper-only imports를 제거한다.
- [x] **Step 2: DEPOSIT_CALLBACK branch 연결**
  - `existingOrder?.status === 'cancelled'` 분기에서 새 helper를 호출한다.
  - 기존 200 ack 응답 payload를 유지한다.
- [x] **Step 3: STATUS_CHANGED DONE branch 연결**
  - `existingOrder.status === 'cancelled'` 분기에서 새 helper를 호출한다.
  - 기존 200 ack 응답 payload를 유지한다.
- [x] **Step 4: source contract 갱신 및 focused app tests GREEN 확인**
  - `__tests__/app/toss-webhook-cancelled-done-source.test.ts`가 local function이 아니라 shared helper import를 확인하게 한다.
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts __tests__/app/toss-webhook-cancelled-done-source.test.ts`

### Task 3: verification and docs

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-16 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts`
  - 1 suite / 2 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts __tests__/app/toss-webhook-cancelled-done-source.test.ts`
  - 2 suites / 3 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/cancelled-order-done.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 38 suites / 195 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과
