# SAF Refactor Phase 23 Toss Confirm Success Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss confirm route의 최종 결제완료/가상계좌발급 알림 scheduling을 `lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts`로 이동한다.

**Architecture:** Route는 결제 승인, 주문 상태 전이, analytics payload 생성을 계속 담당하고, 알림 helper는 이미 계산된 `notifyInfo`, 주문/구매자 정보, Toss 응답을 받아 `after + runAllSettled`로 알림을 예약한다. `tossConfirm.paymentConfirmed.notifications`와 `tossConfirm.virtualAccountIssued.notifications` label은 helper가 보존한다.

**Tech Stack:** Next.js Route Handlers, Jest, TypeScript, existing notification helpers.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 결제 성공 응답은 알림 전송 지연/실패에 묶이지 않고, 응답 후 알림 묶음이 안정적으로 settle된다.
- 알림 불변조건: 기존 `tossConfirm.paymentConfirmed.notifications`, `tossConfirm.virtualAccountIssued.notifications` run labels를 유지한다.
- 구매자 불변조건: buyer email이 없으면 email task를 생략하고 SMS task는 기존처럼 예약한다.
- fallback 불변조건: `notifyInfo`가 없으면 기존 fallback admin notification payload를 유지한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts`
  - payment confirmed / virtual account issued notification scheduling을 담당한다.
- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
  - 결제완료 알림, 가상계좌발급 알림, buyer email 없음 분기를 검증한다.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - 최종 `if (isDone) ... else if (isVirtualAccount) ...` 알림 block을 helper 호출로 교체한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - confirm notification label source contract가 helper 파일을 확인하도록 조정한다.
- Modify: `task.md`, `walkthrough.md`
  - Phase 23 체크리스트와 검증 결과를 기록한다.

---

## Execution Status

2026-07-01 Toss confirm success notification slice 완료:

- [x] `__tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts` 구현
- [x] Toss confirm route final success notification block 연결
- [x] source contract test 갱신
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

### Task 1: Toss confirm success notification helper 도입

**Files:**

- Create Test: `__tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
- Create: `lib/commerce/payment-lifecycle/toss-confirm-success-notifications.ts`

**Interfaces:**

- Produces:
  - `scheduleTossConfirmPaymentConfirmedNotifications(input): void`
  - `scheduleTossConfirmVirtualAccountIssuedNotifications(input): void`
  - Shared input fields: `order`, `orderId`, `amount`, `buyerLocale`, `notifyInfo`
  - Payment confirmed extra field: `paymentMethod`
  - Virtual account extra field: `virtualAccount`

- [x] **Step 1: RED helper tests 추가**
  - payment confirmed: admin warning/payment email, buyer email, buyer SMS가 `tossConfirm.paymentConfirmed.notifications` label로 예약된다.
  - virtual account issued: admin info email, buyer email, buyer SMS가 `tossConfirm.virtualAccountIssued.notifications` label로 예약된다.
  - buyer email 없음: email task 없이 SMS task는 유지된다.

- [x] **Step 2: RED 실패 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
  - Expected: FAIL with module not found for `toss-confirm-success-notifications`.

- [x] **Step 3: helper 최소 구현**
  - 기존 route의 final notification block을 helper 함수 두 개로 옮긴다.
  - admin notification fallback, buyer payload, virtual account payload를 기존과 동일하게 유지한다.

- [x] **Step 4: helper tests GREEN 확인**
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
  - Expected: PASS.

### Task 2: Toss confirm route 연결

**Files:**

- Modify: `app/api/payments/toss/confirm/route.ts`
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`

**Interfaces:**

- Consumes:
  - `scheduleTossConfirmPaymentConfirmedNotifications`
  - `scheduleTossConfirmVirtualAccountIssuedNotifications`

- [x] **Step 1: route import 추가**
  - `app/api/payments/toss/confirm/route.ts`에 두 helper import를 추가한다.

- [x] **Step 2: final notification block 교체**
  - `if (isDone)` branch는 `scheduleTossConfirmPaymentConfirmedNotifications(...)` 호출로 교체한다.
  - `else if (isVirtualAccount)` branch는 `scheduleTossConfirmVirtualAccountIssuedNotifications(...)` 호출로 교체한다.

- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `toss-confirm-notification-source.test.ts`는 confirm notification labels를 helper에서 확인한다.
  - Run: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts __tests__/app/toss-confirm-notification-source.test.ts`

### Task 3: verification and docs

**Files:**

- Modify: `task.md`
- Modify: `walkthrough.md`

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-23 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts`
  - 1 suite / 3 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts __tests__/app/toss-confirm-notification-source.test.ts`
  - 2 suites / 5 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/payment-lifecycle/toss-confirm-success-notifications.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 45 suites / 222 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과

## Self-Review

- Spec coverage: payment confirmed, virtual account issued, no buyer email, label preservation, fallback admin payload이 각 task에 포함되어 있다.
- Placeholder scan: no TBD/TODO/implement later placeholders.
- Type consistency: route consumes the same exported helper names defined in Task 1.
