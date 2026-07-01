# SAF Refactor Phase 22 DEPOSIT_CALLBACK DONE Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss `DEPOSIT_CALLBACK` `DONE` 웹훅의 입금완료 주문 promotion, 동시 구매 경합 자동환불, 입금확인 알림 orchestration을 `lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts`로 이동한다.

**Architecture:** `handleDepositCallbackDonePromotion`은 route가 이미 secret 검증과 Toss API double-verify를 끝낸 뒤 호출된다. helper는 payment row 유무, 주문 조회, already-paid/cancelled guard, payment status update, `markOrderPaidWithOutcome`, `ARTWORK_TAKEN` 자동환불, `tossWebhook.depositPaid.notifications` 알림 예약을 담당하고 route는 결과별 HTTP 응답 매핑만 유지한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Jest, TypeScript, existing commerce lifecycle helpers.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 가상계좌 입금 완료가 검증되면 SAF 주문, 결제 row, 작품 판매 기록, 고객 알림이 한 흐름으로 정리된다.
- 알림 불변조건: 정상 입금완료 알림은 작품을 줄 수 있을 때만 발송한다. `ARTWORK_TAKEN` 경합 패배면 거짓 입금확인/배송 안내를 보내지 않는다.
- 취소 주문 불변조건: 이미 `cancelled`인 주문은 paid로 되살리지 않고 `handleCancelledOrderDoneRefund`로 위임한다.
- fatal 불변조건: 주문 조회 실패, payment row 없음, `PAYMENT_RECORD_FAILED`만 route가 500 retry 응답으로 매핑한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts`
  - DEPOSIT_CALLBACK DONE payment/order promotion, cancelled-order refund scheduling, auto-refund, deposit notification scheduling을 담당한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
  - promotion success notification, cancelled order scheduling, missing payment row fatal, payment-record fatal을 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - `payload.data.paymentStatus === 'DONE'` branch의 paymentRecord 이후 promotion body가 helper를 호출하게 한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - `tossWebhook.depositPaid.notifications` label source contract가 helper 파일도 확인하도록 조정한다.
- Modify: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - DEPOSIT_CALLBACK DONE promotion이 route local lifecycle logic이 아니라 shared helper를 통하도록 source contract를 갱신한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 22 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 DEPOSIT_CALLBACK DONE promotion slice 완료:

- [x] `__tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts` 구현
- [x] Toss webhook route DEPOSIT_CALLBACK DONE branch 연결
- [x] source contract tests 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: DEPOSIT_CALLBACK DONE promotion helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
- Create: `lib/commerce/payment-lifecycle/deposit-callback-done-promotion.ts`

**Interfaces:**

- Produces:
  - `handleDepositCallbackDonePromotion(input): Promise<HandleDepositCallbackDonePromotionResult>`
  - `input.supabase`, `input.paymentRecord`, `input.paymentKey`, `input.webhookOrderId`, `input.verifiedPayment`, `input.provider`, `input.webhookBody`, `input.now`
  - Result:
    - `{ ok: true, status: 'promoted' | 'already_paid' | 'contest_lost' | 'not_promoted' | 'cancelled_order_done_refund_scheduled' }`
    - `{ ok: false, code: 'PAYMENT_RECORD_NOT_FOUND' | 'ORDER_FETCH_FAILED' | 'PAYMENT_RECORD_FAILED', error?: unknown }`

- [x] **Step 1: RED helper tests 추가**
  - awaiting-deposit order: payment row DONE update, `markOrderPaidWithOutcome`, `tossWebhook.depositPaid.notifications` 알림 예약을 검증한다.
  - cancelled order: `handleCancelledOrderDoneRefund` 호출 후 paid promotion을 하지 않는다.
  - payment row 없음: 기존 error notification과 fatal result를 반환한다.
  - `PAYMENT_RECORD_FAILED`: fatal result를 반환하고 정상 입금 알림을 보내지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
  - Expected: FAIL with module not found for `deposit-callback-done-promotion`.

- [x] **Step 3: helper 최소 구현**
  - 기존 route branch의 order fetch, paid/cancelled guard, payment status update, `markOrderPaidWithOutcome`, warnings, `ARTWORK_TAKEN`, deposit notification scheduling을 helper로 옮긴다.
  - fatal result는 route가 기존 HTTP 응답을 유지할 수 있게 code로 반환한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

**Files:**

- Modify: `app/api/webhooks/toss/route.ts`
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
- Modify: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

**Interfaces:**

- Consumes: `handleDepositCallbackDonePromotion` from Task 1.

- [x] **Step 1: route import 추가**
  - `app/api/webhooks/toss/route.ts`에 `handleDepositCallbackDonePromotion` import를 추가한다.

- [x] **Step 2: DEPOSIT_CALLBACK DONE branch 교체**
  - 기존 paymentRecord 이후 promotion body를 helper 호출로 교체한다.
  - helper result가 `already_paid`이면 기존 200 body를 유지한다.
  - helper result가 `cancelled_order_done_refund_scheduled`이면 기존 200 body를 유지한다.
  - helper fatal result는 기존처럼 500으로 매핑한다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `toss-confirm-notification-source.test.ts`는 depositPaid label을 helper에서 확인한다.
  - `toss-webhook-deposit-callback-missing-payment.test.ts`는 route branch가 helper를 호출하고 route-local `markOrderPaidWithOutcome`를 갖지 않는지 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts __tests__/app/toss-confirm-notification-source.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-22 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts`
  - 1 suite / 4 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts __tests__/app/toss-confirm-notification-source.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 3 suites / 10 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-callback-done-promotion.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 44 suites / 219 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: normal deposit promotion, cancelled guard, missing payment row, payment-record fatal, ARTWORK_TAKEN no-false-notification behavior가 각 task에 포함되어 있다.
- Placeholder scan: no TBD/TODO/implement later placeholders.
- Type consistency: route consumes the same exported helper/result names defined in Task 1.
