# SAF Refactor Phase 10 Admin Order Status Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 `updateOrderStatus` DB/status transition mutation을 `lib/orders`로 이동해 action을 알림, 감사 로그, revalidation orchestration 중심으로 얇게 만든다.

**Architecture:** `updateOrderStatus` action은 admin auth, buyer shipping/delivered notification, audit log, admin/public revalidation을 담당한다. 상태 전이 허용표, 주문 조회, optimistic status update, paid 취소 시 active sale void, 취소 시 예약 해제와 작품 상태 재동기화는 `lib/orders/status-transition.ts`가 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자의 상태 변경은 허용된 전이만 가능해야 하며, 취소 전이는 판매/예약 상태를 함께 정리해야 한다.
- 상태 불변조건: `pending_payment → cancelled`, `awaiting_deposit → paid|cancelled`, `paid → preparing`, `preparing → shipped`, `shipped → delivered`, `delivered → completed`, `refund_requested → refunded`만 허용한다.
- 낙관적 잠금 불변조건: update는 기존 상태를 조건으로 걸고, 0행 update는 새로고침 안내 오류로 중단한다.
- 판매 불변조건: `paid → cancelled`는 active `artwork_sales`를 void하고 작품 상태를 재동기화한다.
- 예약 불변조건: `paid|awaiting_deposit → cancelled`는 해당 작품 예약을 다른 active order가 없을 때만 해제한다.
- 부수효과 경계: buyer notification, admin audit log, `revalidatePath`는 action에 남긴다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/status-transition.ts`
  - 관리자 주문 상태 전이 DB mutation, 판매/예약 정리, 작품 상태 재동기화를 담당한다.
- Create Test: `__tests__/lib/orders/status-transition.test.ts`
  - 허용 전이, optimistic locking, shipped tracking payload, paid cancel cleanup, awaiting cancel reservation release를 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `updateOrderStatus`가 `lib/orders/status-transition.ts`를 사용하게 한다.

---

## Execution Status

2026-06-30 admin order status transition slice 완료:

- `lib/orders/status-transition.ts` 도입
  - `updateOrderStatusMutation`
  - `VALID_STATUS_TRANSITIONS`
- `app/actions/admin-orders.ts`의 `updateOrderStatus` action은 admin auth/notification/audit/revalidation 중심으로 축소
- `app/actions/admin-orders.ts`는 978줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/status-transition.test.ts`
  - `npm test -- --runInBand __tests__/lib/orders/status-transition.test.ts __tests__/actions/admin-orders.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/status-transition.test.ts __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)

---

### Task 1: status transition module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/status-transition.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: updateOrderStatus action을 domain module에 연결

- [x] **Step 1: `admin-orders.ts` migration**
- [x] **Step 2: action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3-10 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**
