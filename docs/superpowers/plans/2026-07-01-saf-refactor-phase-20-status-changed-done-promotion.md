# SAF Refactor Phase 20 STATUS_CHANGED DONE Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss `PAYMENT_STATUS_CHANGED` `DONE` 웹훅의 confirm route 실패 보정 promotion과 알림 orchestration을 `lib/commerce/payment-lifecycle/status-changed-done-promotion.ts`로 이동한다.

**Architecture:** `handleStatusChangedDonePromotion`은 payment row의 `order_id`로 주문을 조회하고, cancelled 주문의 자동 Toss cancel 예약, pending/awaiting 주문의 `markOrderPaidWithOutcome` 보정, 동시 구매 경합 자동환불, 보정 성공 알림을 helper 내부에서 처리한다. webhook route는 `newStatus === 'DONE'` guard, helper 호출, fatal payment-record failure와 cancelled-order scheduled 응답 매핑만 유지한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Jest, TypeScript, existing commerce lifecycle helpers.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: confirm route가 결제 기록 생성 뒤 주문/판매 기록 반영에 실패해도 STATUS_CHANGED DONE 웹훅이 주문을 즉시 복구한다.
- 알림 불변조건: `tossWebhook.statusChangedDone.notifications` run label과 운영자 warning, 구매자 `payment_confirmed` 이메일/SMS 흐름을 보존한다.
- 경합 불변조건: `ARTWORK_TAKEN`이면 결제완료 알림을 보내지 않고 `handleArtworkTakenAutoRefund`로 위임한다.
- 취소 주문 불변조건: 이미 `cancelled`인 주문은 paid로 승격하지 않고 `handleCancelledOrderDoneRefund`로 위임한다.
- fatal 불변조건: `markOrderPaidWithOutcome`의 `PAYMENT_RECORD_FAILED`만 route가 500 retry 응답으로 매핑한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/status-changed-done-promotion.ts`
  - STATUS_CHANGED DONE 주문 조회, cancelled-order refund scheduling, paid promotion, auto-refund, notification scheduling을 담당한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
  - promotion success notification, cancelled order scheduling, fatal payment record failure를 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - `newStatus === 'DONE' && paymentRow.order_id` branch가 helper를 호출하게 한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - `tossWebhook.statusChangedDone.notifications` label source contract가 helper 파일도 확인하도록 조정한다.
- Modify: `__tests__/app/toss-webhook-status-changed-missing-payment.test.ts`
  - STATUS_CHANGED DONE promotion이 route local lifecycle logic이 아니라 shared helper를 통하도록 source contract를 갱신한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 20 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 STATUS_CHANGED DONE promotion slice 완료:

- [x] `__tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/payment-lifecycle/status-changed-done-promotion.ts` 구현
- [x] Toss webhook route STATUS_CHANGED DONE branch 연결
- [x] source contract tests 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: STATUS_CHANGED DONE promotion helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
- Create: `lib/commerce/payment-lifecycle/status-changed-done-promotion.ts`

**Interfaces:**

- Produces:
  - `handleStatusChangedDonePromotion(input): Promise<HandleStatusChangedDonePromotionResult>`
  - `input.supabase`, `input.paymentOrderId`, `input.paymentId`, `input.paymentKey`, `input.newStatus`, `input.verifiedPayment`, `input.provider`, `input.now`
  - Result:
    - `{ ok: true, status: 'promoted' | 'skipped' | 'not_promoted' | 'contest_lost' | 'cancelled_order_done_refund_scheduled' }`
    - `{ ok: false, code: 'PAYMENT_RECORD_FAILED', orderNo: string | null, error: string }`

- [x] **Step 1: RED helper tests 추가**
  - active pending order + `markOrderPaidWithOutcome` ok: helper가 lifecycle input을 구성하고 `tossWebhook.statusChangedDone.notifications`로 운영자/구매자 알림을 예약한다.
  - cancelled order: helper가 `handleCancelledOrderDoneRefund`를 호출하고 paid promotion을 하지 않는다.
  - `PAYMENT_RECORD_FAILED`: helper가 fatal result를 반환하고 notification을 예약하지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
  - Expected: FAIL with module not found for `status-changed-done-promotion`.

- [x] **Step 3: helper 최소 구현**
  - 기존 route branch의 order fetch, cancelled guard, `markOrderPaidWithOutcome`, warnings, `ARTWORK_TAKEN`, notification scheduling을 helper로 옮긴다.
  - `PAYMENT_RECORD_FAILED`는 helper result로 돌려 route가 기존처럼 500을 반환하게 한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

**Files:**

- Modify: `app/api/webhooks/toss/route.ts`
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
- Modify: `__tests__/app/toss-webhook-status-changed-missing-payment.test.ts`

**Interfaces:**

- Consumes: `handleStatusChangedDonePromotion` from Task 1.

- [x] **Step 1: route import 추가**
  - `app/api/webhooks/toss/route.ts`에 `handleStatusChangedDonePromotion` import를 추가한다.

- [x] **Step 2: STATUS_CHANGED DONE branch 교체**
  - 기존 branch body를 helper 호출로 교체한다.
  - helper result가 `cancelled_order_done_refund_scheduled`이면 기존 200 body를 유지한다.
  - helper result가 `PAYMENT_RECORD_FAILED`이면 기존처럼 console error 후 500을 반환한다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `toss-confirm-notification-source.test.ts`는 statusChangedDone label을 helper에서 확인한다.
  - `toss-webhook-status-changed-missing-payment.test.ts`는 route branch가 helper를 호출하고 route-local `markOrderPaidWithOutcome`를 갖지 않는지 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts __tests__/app/toss-confirm-notification-source.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-20 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts`
  - 1 suite / 3 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts __tests__/app/toss-confirm-notification-source.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts`
  - 3 suites / 8 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/status-changed-done-promotion.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 42 suites / 211 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: DONE promotion, cancelled guard, ARTWORK_TAKEN, fatal payment record failure, notification label preservation이 각 task에 포함되어 있다.
- Placeholder scan: no TBD/TODO/implement later placeholders.
- Type consistency: route consumes the same exported helper/result names defined in Task 1.
