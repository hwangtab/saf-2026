# SAF Refactor Phase 21 DEPOSIT_CALLBACK CANCELED Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss `DEPOSIT_CALLBACK` `CANCELED` 웹훅의 입금대기 주문 취소, 예약 해제, 공개 cache revalidation, 운영자 알림 orchestration을 `lib/commerce/refund-cancel/deposit-callback-canceled.ts`로 이동한다.

**Architecture:** `handleDepositCallbackCanceled`는 payment row가 있으면 주문을 조회하고 기존 shared `cancelAwaitingDepositOrder`로 awaiting-deposit 취소 lifecycle을 수행한다. payment row가 없거나 주문 상태가 이미 바뀐 경우에도 기존 route처럼 Toss callback은 ack 가능하게 유지하고, 운영자 `가상계좌 입금 취소/만료` warning 알림은 항상 예약한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Jest, TypeScript, existing `cancelAwaitingDepositOrder` lifecycle helper.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: Toss 가상계좌 만료/취소가 오면 SAF awaiting-deposit 주문과 작품 예약도 같은 취소 lifecycle을 따른다.
- 재사용 불변조건: route-local `extractLineItems`, `releaseReservedArtworksIfUnowned`, `revalidatePath`, `revalidatePublicArtworkSurfaces`를 다시 구현하지 않고 `cancelAwaitingDepositOrder`를 사용한다.
- 알림 불변조건: 기존 `가상계좌 입금 취소/만료` warning 알림은 payment row 유무와 관계없이 유지한다.
- retry 불변조건: 주문 상태 mismatch나 예약 해제 warning은 Toss에 500 retry를 유도하지 않는다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/refund-cancel/deposit-callback-canceled.ts`
  - DEPOSIT_CALLBACK CANCELED 주문 조회, shared awaiting cancel lifecycle 호출, warning notification scheduling을 담당한다.
- Create Test: `__tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
  - payment row 존재 시 shared lifecycle 호출, payment row 없음 skip notification, lifecycle warning logging을 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - `payload.data.paymentStatus === 'CANCELED'` branch가 helper를 호출하게 한다.
- Modify: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - DEPOSIT_CALLBACK CANCELED branch가 route-local reservation/revalidation logic을 갖지 않도록 source contract를 추가한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 21 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 DEPOSIT_CALLBACK CANCELED slice 완료:

- [x] `__tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/refund-cancel/deposit-callback-canceled.ts` 구현
- [x] Toss webhook route DEPOSIT_CALLBACK CANCELED branch 연결
- [x] source contract test 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: DEPOSIT_CALLBACK CANCELED helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
- Create: `lib/commerce/refund-cancel/deposit-callback-canceled.ts`

**Interfaces:**

- Produces:
  - `handleDepositCallbackCanceled(input): Promise<HandleDepositCallbackCanceledResult>`
  - `input.supabase`, `input.paymentOrderId`, `input.paymentKey`, `input.webhookOrderId`, `input.now`
  - Result:
    - `{ ok: true, status: 'cancelled' | 'skipped_no_payment' | 'order_missing' | 'not_cancelled' }`

- [x] **Step 1: RED helper tests 추가**
  - payment row 존재: 주문 조회 후 `cancelAwaitingDepositOrder`가 호출되고 warning 알림이 예약된다.
  - payment row 없음: lifecycle은 skip하지만 warning 알림은 예약된다.
  - shared lifecycle warning: `RESERVATION_RELEASE_FAILED` warning을 console error로 남기고 500 fatal로 바꾸지 않는다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
  - Expected: FAIL with module not found for `deposit-callback-canceled`.

- [x] **Step 3: helper 최소 구현**
  - payment row id가 있으면 주문을 `id, order_no, artwork_id, order_items(...)`로 조회한다.
  - 주문이 있으면 `cancelAwaitingDepositOrder({ supabase, order, now })`를 호출한다.
  - lifecycle 실패/경고는 logging만 하고 Toss retry fatal로 올리지 않는다.
  - `after(() => notifyEmail('warning', '가상계좌 입금 취소/만료', ...))`를 항상 예약한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

**Files:**

- Modify: `app/api/webhooks/toss/route.ts`
- Modify: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

**Interfaces:**

- Consumes: `handleDepositCallbackCanceled` from Task 1.

- [x] **Step 1: route import 추가**
  - `app/api/webhooks/toss/route.ts`에 `handleDepositCallbackCanceled` import를 추가한다.

- [x] **Step 2: DEPOSIT_CALLBACK CANCELED branch 교체**
  - 기존 branch의 order update/release/revalidation/notification body를 helper 호출로 교체한다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - route가 `handleDepositCallbackCanceled({`를 호출하고 CANCELED branch 안에 `releaseReservedArtworksIfUnowned(`, `extractLineItems(`, `revalidatePath(`를 갖지 않는지 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-21 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts`
  - 1 suite / 3 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 2 suites / 7 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/deposit-callback-canceled.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 43 suites / 215 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: lifecycle reuse, payment-row missing behavior, notification preservation, nonfatal warning behavior가 각 task에 포함되어 있다.
- Placeholder scan: no TBD/TODO/implement later placeholders.
- Type consistency: route consumes the same exported helper/result names defined in Task 1.
