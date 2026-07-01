# SAF Refactor Phase 19 Toss Canceled Cascade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Toss `PAYMENT_STATUS_CHANGED` CANCELED/PARTIAL_CANCELED 웹훅의 주문 환불 cascade와 알림 orchestration을 `lib/commerce/refund-cancel/toss-canceled-cascade.ts`로 이동한다.

**Architecture:** `handleTossCanceledPaymentCascade`는 payment row의 `order_id`로 주문을 조회하고, 이미 `refunded`/`cancelled`인 주문은 멱등 skip한다. 활성 주문이면 기존 route 동작과 동일하게 `orders.status='refunded'`, active `artwork_sales` void, 작품 상태 재동기화, 예약 해제, public revalidation, 운영자/구매자 알림 예약을 수행한다. webhook route는 `CANCELED_STATUSES` guard와 helper 호출만 유지한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, notification mocks, reservation/status/revalidation mocks, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: Toss가 결제를 CANCELED/PARTIAL_CANCELED로 통지하면 SAF 주문과 작품/판매 기록도 환불 상태로 보정한다.
- 멱등 불변조건: 이미 `refunded` 또는 `cancelled`인 주문에는 추가 mutation/알림을 하지 않는다.
- 주문 불변조건: helper는 기존 route처럼 `orders.status='refunded'`, `refunded_at=now`로 업데이트하고 `not('status','in','(refunded,cancelled)')` guard를 유지한다.
- 판매/작품 불변조건: active `artwork_sales`를 void하고, order_items 또는 legacy `artwork_id`의 작품 상태를 재동기화하며, reserved artwork도 available로 해제한다.
- 알림 불변조건: 기존 `tossWebhook.canceled.notifications` run label, 관리자 `Toss 결제 취소 수신`, 구매자 `refunded` 이메일/SMS 흐름을 보존한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/refund-cancel/toss-canceled-cascade.ts`
  - Toss CANCELED/PARTIAL_CANCELED webhook order cascade helper와 result type을 담당한다.
- Create Test: `__tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts`
  - active order cascade, already terminal skip, notification scheduling을 검증한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - CANCELED_STATUSES branch가 helper를 호출하게 한다.
- Modify: `__tests__/app/toss-confirm-notification-source.test.ts`
  - notification run label source contract가 helper 파일도 확인하도록 조정한다.

---

## Execution Status

2026-07-01 Toss canceled cascade slice 완료:

- [x] `__tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/refund-cancel/toss-canceled-cascade.ts` 구현
- [x] Toss webhook route CANCELED_STATUSES branch 연결
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: Toss canceled cascade helper 도입

- [x] **Step 1: RED helper tests 추가**
  - active order 케이스: 주문 조회, order refunded update, artwork_sales void, artwork status sync, reservation release, public revalidation, notification scheduling을 검증한다.
  - terminal order 케이스: `refunded`/`cancelled` 주문이면 mutation/notification 없이 skip을 반환한다.
- [x] **Step 2: RED 실패 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts`
  - Expected: module not found 또는 exported function missing.
- [x] **Step 3: helper 최소 구현**
  - `handleTossCanceledPaymentCascade(input)`를 export한다.
  - result는 `{ ok: true, skipped: boolean, artworkIds: string[] }` 또는 `{ ok: false, code: 'ORDER_FETCH_FAILED' }`로 시작한다.
- [x] **Step 4: helper tests GREEN 확인**
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts`
  - Expected: PASS.

### Task 2: Toss webhook route 연결

- [x] **Step 1: route import 추가**
  - `app/api/webhooks/toss/route.ts`에 `handleTossCanceledPaymentCascade` import를 추가한다.
- [x] **Step 2: CANCELED_STATUSES branch 교체**
  - 기존 branch의 주문 조회/cascade/notification body를 helper 호출로 교체한다.
  - existing order fetch failure는 helper 내부에서 logging하지 않고 result로 돌려 route가 500을 반환하게 한다.
- [x] **Step 3: source contract 갱신 및 focused app tests GREEN 확인**
  - `__tests__/app/toss-confirm-notification-source.test.ts`가 helper의 `tossWebhook.canceled.notifications` label을 확인하게 한다.
  - `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts __tests__/app/toss-confirm-notification-source.test.ts`

### Task 3: verification and docs

- [x] **Step 1: Phase focused regression Jest**
  - Phase 3-19 관련 focused suite를 실행한다.
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
- [x] **Step 5: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts`
  - expected module-not-found failure confirmed
- GREEN focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts`
  - 1 suite / 2 tests
- Route focused: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts __tests__/app/toss-confirm-notification-source.test.ts`
  - 2 suites / 4 tests
- Phase regression: `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/toss-canceled-cascade.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 41 suites / 208 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과
