# SAF Refactor Phase 6 Buyer Order Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `order-lookup.ts`의 구매자 배송정보 수정 mutation을 `lib/orders`로 이동해 action을 얇게 만든다.

**Architecture:** rate limit, request header, 세션 조회는 Server Action에 남기고, 배송 입력 정규화, 주문 소유권 검증, 상태 검증, 배송지 update는 `lib/orders/buyer-mutations.ts`가 담당한다. 기존 `updateBuyerShipping` export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 구매자가 결제 후 배송 시작 전까지 배송정보를 안전하게 수정할 수 있어야 한다.
- 권한 불변조건: 로그인 owner는 이메일 없이 수정 가능하지만, 비로그인 사용자는 주문 이메일과 일치해야 한다.
- 상태 불변조건: 배송정보 수정은 `paid`/`preparing` 주문에만 허용한다.
- 입력 불변조건: 필수 배송 필드는 trim 기준으로 비어 있으면 `INVALID_INPUT`을 반환한다.
- 오류 불변조건: update 실패는 외부에 DB 오류를 노출하지 않고 `UPDATE_FAILED`로 반환한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 buyer order mutations slice 완료:

- `lib/orders/buyer-mutations.ts` 도입
  - `updateBuyerShippingMutation`
- `app/actions/order-lookup.ts`의 `updateBuyerShipping` action은 rate limit/session orchestration 중심으로 축소
- `app/actions/order-lookup.ts`는 925줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/buyer-mutations.test.ts __tests__/actions/order-lookup.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/orders/buyer-mutations.ts`
  - 구매자 주문 배송지 수정 mutation과 권한/상태/입력 정책을 담당한다.
- Create Test: `__tests__/lib/orders/buyer-mutations.test.ts`
  - trim update, blank input, session owner, email mismatch, invalid status, update failure를 검증한다.
- Modify: `app/actions/order-lookup.ts`
  - `updateBuyerShipping`이 `lib/orders/buyer-mutations.ts`를 사용하게 한다.

---

### Task 1: buyer mutation module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/orders/buyer-mutations.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: buyer shipping action을 domain module에 연결

- [x] **Step 1: `order-lookup.ts` migration**
- [x] **Step 2: action tests GREEN 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: Phase 3/4/5/6 focused regression Jest**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
