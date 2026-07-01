# SAF Refactor Phase 14 Guest Order Claims Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `order-lookup.ts`의 게스트 주문 회원 귀속 DB mutation을 `lib/orders/guest-claims.ts`로 이동해 action을 세션 조회와 오류 로깅 중심으로 얇게 만든다.

**Architecture:** `claimGuestOrdersMutation`은 검증된 사용자 이메일 판별, `buyer_user_id is null` 주문 귀속 update, update error 구조화를 담당한다. `claimGuestOrders` Server Action은 Supabase session client로 사용자만 조회하고, admin client와 mutation 호출, 기존 console error logging fallback만 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 게스트 주문 귀속은 이메일 소유가 검증된 회원에게만 허용한다.
- 보안 불변조건: `email_confirmed_at`이 없거나 이메일이 비어 있으면 어떤 DB update도 실행하지 않는다.
- 소유권 불변조건: `buyer_user_id`가 `null`이고 `buyer_email`이 정규화된 회원 이메일과 일치하는 주문만 update한다.
- 장애 fallback: update error나 예상치 못한 예외는 고객 화면을 깨지 않고 `{ claimed: 0 }`으로 유지한다.
- 부수효과 경계: domain module은 DB update 결과와 update error만 반환하고 console logging을 하지 않는다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/guest-claims.ts`
  - 게스트 주문 회원 귀속 mutation과 관련 타입을 담당한다.
- Create Test: `__tests__/lib/orders/guest-claims.test.ts`
  - 미로그인/미검증 이메일/이메일 정규화/update 성공/update error를 검증한다.
- Modify: `app/actions/order-lookup.ts`
  - `claimGuestOrders`가 `claimGuestOrdersMutation`을 사용하게 한다.
- Modify: `__tests__/actions/order-lookup.test.ts`
  - source boundary assertion을 새 domain module 경계에 맞게 추가한다.

---

## Execution Status

2026-06-30 guest order claims slice 완료:

- [x] `__tests__/lib/orders/guest-claims.test.ts` RED 추가 및 실패 확인
- [x] `lib/orders/guest-claims.ts` 구현
- [x] `app/actions/order-lookup.ts`의 `claimGuestOrders` 연결
- [x] action source boundary test 추가
- [x] focused tests, type-check, Phase 3-14 regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: guest order claims domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/guest-claims.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: order-lookup claimGuestOrders action을 domain module에 연결

- [x] **Step 1: `claimGuestOrdersMutation` import**
- [x] **Step 2: 기존 DB update 로직 제거 후 mutation 결과 기반 오류 로깅 유지**
- [x] **Step 3: action source boundary test 추가**
- [x] **Step 4: focused action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3-14 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED 확인:
  - `npm test -- --runInBand __tests__/lib/orders/guest-claims.test.ts`
  - expected failure: `Cannot find module '../../../lib/orders/guest-claims'`
- Focused GREEN:
  - `npm test -- --runInBand __tests__/lib/orders/guest-claims.test.ts`
  - 1 suite / 4 tests
  - `npm test -- --runInBand __tests__/lib/orders/guest-claims.test.ts __tests__/actions/order-lookup.test.ts`
  - 2 suites / 48 tests
- Phase 3-14 regression:
  - `npm test -- --runInBand __tests__/lib/orders/guest-claims.test.ts __tests__/lib/orders/admin-awaiting-cancel.test.ts __tests__/lib/orders/admin-refund.test.ts __tests__/lib/orders/admin-read-model.test.ts __tests__/lib/orders/status-transition.test.ts __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 34 suites / 188 tests
- `npm run type-check` 통과
- `npm run lint` 통과
  - 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check` 통과
