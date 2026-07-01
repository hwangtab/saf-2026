# SAF Refactor Phase 25 Toss Confirm Paid Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss confirm route의 DONE 결제 paid promotion, order status mismatch 보상, `ARTWORK_TAKEN` 자동환불, 판매기록 경고 알림을 `lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.ts`로 이동한다.

**Architecture:** Route는 요청 검증, Toss 승인 호출, HTTP response/analytics 조립을 유지한다. 새 helper는 `DONE` 전용 lifecycle을 담당하며 `markOrderPaidWithOutcome` 호출, payment/order/sales 결과 분기, cancelled-order auto refund notification, contest-lost auto refund delegation, 판매기록 경고 알림 scheduling을 처리한다.

**Tech Stack:** Next.js Route Handler, Supabase client, Toss cancel API, existing payment lifecycle/refund helpers, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: Toss DONE 승인이 확인돼도 내부 주문 상태 전이가 실패하면 성공 알림과 성공 응답으로 이어지지 않는다.
- 멱등 불변조건: `ORDER_STATE_MISMATCH` 뒤 최신 주문 상태가 이미 `paid`면 기존처럼 `already_promoted` 성공으로 간주한다.
- 취소 경합 불변조건: `ORDER_STATE_MISMATCH` 뒤 최신 주문 상태가 `paid`가 아니면 자동 Toss cancel을 시도하고 운영자에게 수동 확인 필요 알림을 남긴다.
- 동시 구매 경합 불변조건: `ARTWORK_TAKEN`은 구매자 성공 알림 없이 기존 `handleArtworkTakenAutoRefund` helper로 위임한다.
- 경고 불변조건: 판매기록 실패/품목 없음 경고는 결제 성공 자체를 막지 않되 기존 운영자 알림을 유지한다.
- 알림 불변조건: `toss-confirm.cancelled-order-refund.notification`, `tossConfirm.orderStatusSyncFailed.notifications` label을 보존한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.ts`
  - `DONE` confirm lifecycle을 담당한다.
  - `markOrderPaidWithOutcome`, `handleArtworkTakenAutoRefund`, Toss `cancelPayment`, 운영자 알림 scheduling을 캡슐화한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
  - 성공 promotion, payment record failure, already promoted, status mismatch cancel, artwork taken, sales warnings를 검증한다.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - `isDone` branch의 `markOrderPaidWithOutcome` 결과 분기와 warning loop를 helper 호출로 교체한다.
- Modify: `__tests__/app/toss-confirm-payment-record-failure.test.ts`
  - DONE promotion source contract가 새 helper 파일을 확인하도록 조정한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - DONE status mismatch notification label source가 helper 파일에 있는지 확인한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 25 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 완료:

- [x] helper RED test 추가 및 실패 확인
- [x] `toss-confirm-paid-promotion.ts` 구현
- [x] Toss confirm route DONE branch 연결
- [x] source contract test 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Toss confirm paid promotion helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
- Create: `lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.ts`

**Interfaces:**

- Produces:
  - `promoteTossConfirmPaidOrder(input): Promise<TossConfirmPaidPromotionResult>`
  - `TossConfirmPaidPromotionResult`
    - `{ ok: true; status: 'promoted' }`
    - `{ ok: true; status: 'already_promoted' }`
    - `{ ok: true; status: 'contest_lost' }`
    - `{ ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }`
    - `{ ok: false; code: 'ORDER_STATUS_SYNC_FAILED'; statusCode: 500 | 409; latestStatus: string | null; error: string }`
- Consumes:
  - `markOrderPaidWithOutcome`
  - `handleArtworkTakenAutoRefund`
  - `cancelPayment`
  - `notifyEmail`
  - `runAllSettled`
  - route에서 주입한 `logOrderStatusSyncFailure` callback

- [x] **Step 1: RED helper tests 추가**
  - 성공: `markOrderPaidWithOutcome`을 confirm용 옵션으로 호출하고 `{ ok: true, status: 'promoted' }`를 반환한다.
  - payment record failure: `{ ok: false, code: 'PAYMENT_RECORD_FAILED' }`를 반환한다.
  - already promoted: `ORDER_STATE_MISMATCH` 뒤 latest status가 `paid`면 `{ ok: true, status: 'already_promoted' }`를 반환하고 cancel/notification을 실행하지 않는다.
  - status mismatch cancel: latest status가 `cancelled`면 Toss cancel, `toss-confirm.cancelled-order-refund.notification`, `tossConfirm.orderStatusSyncFailed.notifications`, logging callback을 실행하고 409 결과를 반환한다.
  - artwork taken: `handleArtworkTakenAutoRefund`에 confirm context를 넘기고 `{ ok: true, status: 'contest_lost' }`를 반환한다.
  - sales warnings: `ARTWORK_SALES_FAILED`와 `NO_LINE_ITEMS` warning을 운영자 알림으로 예약한다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
  - Expected: FAIL with module not found for `toss-confirm-paid-promotion`.

- [x] **Step 3: helper 최소 구현**
  - 기존 route의 `isDone` branch 전체와 `paidWarnings` loop를 helper로 이동한다.
  - helper는 HTTP response를 만들지 않고 route가 매핑할 result만 반환한다.
  - activity log 기록은 `app/actions` import 없이 route가 넘긴 `logOrderStatusSyncFailure` callback을 `runAllSettled` task로 실행한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
  - Expected: PASS.

### Task 2: Toss confirm route 연결

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify: `__tests__/app/toss-confirm-payment-record-failure.test.ts`
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`

**Interfaces:**

- Consumes:
  - `promoteTossConfirmPaidOrder`
  - `TossConfirmPaidPromotionResult`

- [x] **Step 1: route import 추가**
  - `app/api/payments/toss/confirm/route.ts`에 `promoteTossConfirmPaidOrder` import를 추가한다.
  - 더 이상 route에서 직접 쓰지 않는 `markOrderPaidWithOutcome`, `handleArtworkTakenAutoRefund` import를 제거한다.

- [x] **Step 2: DONE branch 교체**
  - `isDone` branch는 helper 호출과 result-to-response 매핑만 남긴다.
  - `PAYMENT_RECORD_FAILED`는 기존 `buildPaymentRecordFailureResponse`를 통해 500으로 응답한다.
  - `ORDER_STATUS_SYNC_FAILED`는 `{ error: apiError('payment_confirmation_failed', buyerLocale), code: 'ORDER_STATUS_SYNC_FAILED' }`, helper의 `statusCode`로 응답한다.
  - `already_promoted`는 기존처럼 notifyInfo를 조회해 analytics 포함 성공 응답을 반환한다.
  - `contest_lost`는 기존처럼 `{ success: true, status: 'REFUNDED', refunded: true, reason: 'artwork_taken' }`를 반환한다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `toss-confirm-payment-record-failure.test.ts`는 DONE promotion helper 파일에서 `markOrderPaidWithOutcome` 호출을 확인한다.
  - `toss-confirm-notification-source.test.ts`는 DONE status mismatch 알림 label을 helper 파일에서 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-notification-source.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-01-saf-refactor-phase-25-toss-confirm-paid-promotion.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-25 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: 문서 갱신**
  - plan execution status를 완료로 바꾼다.
  - `task.md`에 Phase 25 체크리스트를 추가한다.
  - `walkthrough.md`에 helper, route line count, 검증 결과, 남은 후보를 갱신한다.

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts`
  - 1 suite / 7 tests
- Route/source focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-notification-source.test.ts`
  - 3 suites / 15 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion.test.ts ... __tests__/app/reservation-release-source.test.ts`
  - 48 suites / 238 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: payment row 실패, order update 실패, state mismatch, already promoted, artwork taken, sales warnings, label 보존, buyer 성공 알림 suppression이 각 task에 포함되어 있다.
- Placeholder scan: TBD/TODO/implement later placeholder 없음.
- Type consistency: route가 소비할 `promoteTossConfirmPaidOrder`와 result union 이름을 Task 1/2에서 동일하게 사용한다.
