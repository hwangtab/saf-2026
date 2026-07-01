# SAF Refactor Phase 18 Deposit Callback Missing Payment Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss `DEPOSIT_CALLBACK` DONE 웹훅에서 payment row가 없을 때 row를 복구하는 orchestration을 `lib/commerce/payment-lifecycle/deposit-missing-payment-repair.ts`로 이동한다.

**Architecture:** `repairDepositCallbackMissingPaymentRecord`는 webhook orderId로 SAF 주문을 찾고, 주문 metadata에서 provider를 결정한 뒤 Toss API로 DONE 상태와 orderId를 검증한다. 검증된 Toss payment로 `ensureTossPaymentRecord`를 호출하고, route가 이어서 secret 검증과 입금 완료 promotion을 할 수 있도록 provider, verified payment, payment record shape를 반환한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Toss fetch/record helper mocks, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: DEPOSIT_CALLBACK DONE이 도착했는데 `payments` row가 없으면 Toss API 이중검증 후 row를 복구하고, 검증 실패는 성공처럼 숨기지 않는다.
- 보안 불변조건: helper가 복구한 `confirm_response.virtualAccount.secret`를 route의 기존 `verifyDepositCallbackSecret` 검증에 사용한다.
- 검증 불변조건: Toss API 응답은 `status === 'DONE'`이고 `orderId === payload.data.orderId`여야 한다.
- 결제 불변조건: idempotency key는 기존과 같은 `webhook-deposit-${paymentKey}`를 사용한다.
- route 응답 불변조건: 주문 조회 실패, Toss 검증 실패, payment create/refetch 실패는 기존처럼 500을 반환해 Toss retry를 유도한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/deposit-missing-payment-repair.ts`
  - DEPOSIT_CALLBACK DONE missing payment row repair helper와 result type을 담당한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts`
  - order lookup/provider resolve/fetch verify/ensure/refetch/failure codes를 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - DEPOSIT_CALLBACK missing payment branch가 helper를 호출하게 한다.
- Modify: `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - source contract가 helper import/호출을 확인하도록 조정한다.

---

## Execution Status

2026-07-01 deposit callback missing payment repair slice 완료:

- [x] `__tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/payment-lifecycle/deposit-missing-payment-repair.ts` 구현
- [x] Toss webhook route DEPOSIT_CALLBACK missing payment branch 연결
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: deposit missing payment repair helper 도입

- [x] **Step 1: RED helper tests 추가**
  - 성공 케이스: `orders.order_no` 조회, metadata provider resolve, `fetchPayment(paymentKey, provider)` 검증, `ensureTossPaymentRecord` 호출, `paymentId`가 있으면 `{ id, order_id, webhook_responses: [], confirm_response: verifiedPayment }` 반환을 검증한다.
  - refetch 케이스: `ensureTossPaymentRecord`가 `paymentId: null`을 반환하면 `payments.payment_key`로 refetch한 row를 반환한다.
  - 실패 케이스: 주문 조회 실패, Toss 검증 실패, payment create 실패 result code를 검증한다.
- [x] **Step 2: RED 실패 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts`
  - Expected: module not found 또는 exported function missing.
- [x] **Step 3: helper 최소 구현**
  - `repairDepositCallbackMissingPaymentRecord(input)`를 export한다.
  - result union은 `ok: true`와 `ok: false` code를 명확히 반환한다.
- [x] **Step 4: helper tests GREEN 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

- [x] **Step 1: route import 추가**
  - `app/api/webhooks/toss/route.ts`에 `repairDepositCallbackMissingPaymentRecord` import를 추가한다.
  - route에서 직접 order lookup/fetch/ensure/refetch를 하던 DEPOSIT_CALLBACK missing payment branch를 helper 호출로 교체한다.
- [x] **Step 2: error mapping 유지**
  - `ORDER_FETCH_FAILED`, `VERIFY_FAILED`, `PAYMENT_RECORD_FAILED`, `PAYMENT_REFETCH_FAILED`는 각각 기존 console prefix/notify/500 의미를 유지한다.
- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `__tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`가 helper import/호출을 확인하게 한다.
  - `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`

### Task 3: verification and docs

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-18 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts`
  - 1 suite / 5 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 2 suites / 8 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/deposit-missing-payment-repair.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 40 suites / 206 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과
