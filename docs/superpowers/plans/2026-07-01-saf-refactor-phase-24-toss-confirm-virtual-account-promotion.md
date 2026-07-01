# SAF Refactor Phase 24 Toss Confirm Virtual Account Promotion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss confirm route의 가상계좌 발급 payment record, unique 작품 예약, 주문 상태 전이, 실패 보상 흐름을 `lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts`로 이동한다.

**Architecture:** Route는 요청 검증, Toss 승인 호출, 최종 HTTP response/analytics 조립을 유지한다. 새 helper는 `WAITING_FOR_DEPOSIT` 전용 lifecycle을 담당하며, payment row 생성, unique 예약, 예약 실패 자동 취소, 주문 상태 경합 cancel/release, public revalidation, 운영자 알림 scheduling을 한 경계에서 처리한다.

**Tech Stack:** Next.js Route Handler, Supabase client, Toss cancel API, existing reservation/payment-record/revalidation/notification helpers, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 가상계좌 입금 안내는 unique 작품 예약과 주문 `awaiting_deposit` 전이가 모두 성공한 뒤에만 나간다.
- 실패 불변조건: payment row 저장 실패는 기존처럼 500으로 응답하고 성공/입금 안내 알림을 보내지 않는다.
- 예약 실패 불변조건: unique 작품 예약 실패 시 Toss 가상계좌를 자동 취소하고, 주문을 `cancelled`로 바꾸며, buyer 입금 안내를 보내지 않는다.
- 경합 불변조건: 예약은 성공했지만 주문 상태 전이가 0행이면 예약을 해제하고 Toss 가상계좌를 비동기 취소하며, buyer 입금 안내를 보내지 않는다.
- 알림 불변조건: `toss-confirm.virtual-account-reservation-failed.notifications`, `toss-confirm.virtual-account-race-cancel.notification`, `tossConfirm.orderStatusSyncFailed.notifications` label을 보존한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts`
  - `WAITING_FOR_DEPOSIT` confirm lifecycle을 담당한다.
  - `ensureTossPaymentRecord`, `reserveUniqueArtworksOrRollback`, `releaseReservedArtworksIfUnowned`, Toss `cancelPayment`, payment/order status sync, public revalidation, 운영자 알림 scheduling을 캡슐화한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
  - 성공 promotion, payment record failure, reservation failure, race cancellation을 검증한다.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - 가상계좌 branch의 payment record/reservation/order update/race compensation block을 helper 호출로 교체한다.
  - route는 helper result를 HTTP response로 매핑하고, 최종 성공 알림 scheduling은 Phase 23 helper를 계속 사용한다.
- Modify: `__tests__/app/toss-confirm-virtual-account-reservation.test.ts`
  - route-level behavior test는 유지하되 helper 연결 이후에도 buyer 입금 안내 suppression을 검증한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - 가상계좌 예약 실패/race cancel 알림 label source가 helper 파일에 있는지 확인한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 24 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 완료:

- [x] helper RED test 추가 및 실패 확인
- [x] `toss-confirm-virtual-account-promotion.ts` 구현
- [x] Toss confirm route 가상계좌 branch 연결
- [x] source contract test 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Toss confirm virtual-account promotion helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
- Create: `lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.ts`

**Interfaces:**

- Produces:
  - `promoteTossConfirmVirtualAccount(input): Promise<TossConfirmVirtualAccountPromotionResult>`
  - `TossConfirmVirtualAccountPromotionResult`
    - `{ ok: true; status: 'promoted'; reservedArtworkIds: string[] }`
    - `{ ok: true; status: 'already_promoted'; reservedArtworkIds: string[] }`
    - `{ ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }`
    - `{ ok: false; code: 'RESERVATION_FAILED'; failedArtworkId: string | null }`
    - `{ ok: false; code: 'ORDER_STATUS_SYNC_FAILED'; statusCode: 500 | 409; latestStatus: string | null; error: string }`
- Consumes:
  - `ensureTossPaymentRecord`
  - `reserveUniqueArtworksOrRollback`
  - `releaseReservedArtworksIfUnowned`
  - `cancelPayment`
  - `revalidatePath`
  - `revalidatePublicArtworkSurfaces`
  - `notifyEmail`
  - route에서 주입한 `logOrderStatusSyncFailure` callback
  - `runAllSettled`

- [x] **Step 1: RED helper tests 추가**
  - 성공: payment row 생성, unique 예약, order `awaiting_deposit` 전이, reserved artwork public revalidation을 검증한다.
  - payment record failure: `{ ok: false, code: 'PAYMENT_RECORD_FAILED' }`를 반환하고 reservation/order update를 호출하지 않는다.
  - reservation failure: Toss cancel, order `cancelled`, payments `CANCELED` sync, `toss-confirm.virtual-account-reservation-failed.notifications` label을 검증한다.
  - race cancellation: 예약 후 order update 0행이면 reservation release, `after` 내부 Toss cancel, payments `CANCELED` sync, `toss-confirm.virtual-account-race-cancel.notification`, `tossConfirm.orderStatusSyncFailed.notifications` label을 검증한다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
  - Expected: FAIL with module not found for `toss-confirm-virtual-account-promotion`.

- [x] **Step 3: helper 최소 구현**
  - 기존 route의 `else` branch 중 `ensureTossPaymentRecord`부터 가상계좌 order update/revalidation까지를 helper로 이동한다.
  - helper는 HTTP 응답 문자열을 만들지 않고, route가 매핑할 수 있는 result code만 반환한다.
  - 예약 실패와 경합 실패에서는 buyer 입금 안내 helper를 호출하지 않는다.
  - activity log 기록은 `app/actions` import 없이 route가 넘긴 `logOrderStatusSyncFailure` callback을 `runAllSettled` task로 실행한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
  - Expected: PASS.

### Task 2: Toss confirm route 연결

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify: `__tests__/app/toss-confirm-virtual-account-reservation.test.ts`
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`

**Interfaces:**

- Consumes:
  - `promoteTossConfirmVirtualAccount`
  - `TossConfirmVirtualAccountPromotionResult`

- [x] **Step 1: route import 추가**
  - `app/api/payments/toss/confirm/route.ts`에 `promoteTossConfirmVirtualAccount` import를 추가한다.
  - 더 이상 route에서 직접 쓰지 않는 `ensureTossPaymentRecord`, `reserveUniqueArtworksOrRollback`, `releaseReservedArtworksIfUnowned`, `revalidatePath`, `revalidatePublicArtworkSurfaces` import를 제거한다.

- [x] **Step 2: 가상계좌 branch 교체**
  - `isDone` branch는 기존 `markOrderPaidWithOutcome` 흐름을 유지한다.
  - `!isDone` branch는 helper 호출과 result-to-response 매핑만 남긴다.
  - `PAYMENT_RECORD_FAILED`는 기존 `buildPaymentRecordFailureResponse`를 통해 500으로 응답한다.
  - `RESERVATION_FAILED`는 `{ error: apiError('artwork_sold_out', buyerLocale) }`, status 409로 응답한다.
  - `ORDER_STATUS_SYNC_FAILED`는 `{ error: apiError('payment_confirmation_failed', buyerLocale), code: 'ORDER_STATUS_SYNC_FAILED' }`, helper의 `statusCode`로 응답한다.
  - `already_promoted`는 기존처럼 성공 응답을 반환하되 analytics는 null로 둔다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `toss-confirm-notification-source.test.ts`는 가상계좌 reservation/race 알림 label을 helper 파일에서 확인한다.
  - `toss-confirm-virtual-account-reservation.test.ts`는 route behavior가 유지되는지 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-confirm-notification-source.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`
- Modify: `docs/superpowers/plans/2026-07-01-saf-refactor-phase-24-toss-confirm-virtual-account-promotion.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-24 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: 문서 갱신**
  - plan execution status를 완료로 바꾼다.
  - `task.md`에 Phase 24 체크리스트를 추가한다.
  - `walkthrough.md`에 helper, route line count, 검증 결과, 남은 후보를 갱신한다.

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts`
  - 1 suite / 4 tests
- Route/source focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-notification-source.test.ts __tests__/app/reservation-release-source.test.ts`
  - 5 suites / 15 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion.test.ts ... __tests__/app/reservation-release-source.test.ts`
  - 47 suites / 230 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: payment row 저장 실패, unique 예약 실패, order 상태 경합, 성공 promotion, 알림 label 보존, buyer 안내 suppression이 각 task에 포함되어 있다.
- Placeholder scan: TBD/TODO/implement later placeholder 없음.
- Type consistency: route가 소비할 `promoteTossConfirmVirtualAccount`와 result union 이름을 Task 1/2에서 동일하게 사용한다.
