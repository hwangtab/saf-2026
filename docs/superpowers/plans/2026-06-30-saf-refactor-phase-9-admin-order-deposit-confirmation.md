# SAF Refactor Phase 9 Admin Order Deposit Confirmation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 `confirmDeposit` DB/RPC mutation을 `lib/orders`로 이동해 action을 알림, 감사 로그, revalidation orchestration 중심으로 얇게 만든다.

**Architecture:** `confirmDeposit` action은 admin auth, notification, audit log, revalidation을 담당한다. 주문 조회, 입금대기 상태 검증, `confirm_bank_transfer_order` RPC 호출, RPC 결과 검증, 작품 상태 재동기화는 `lib/orders/deposit-confirmation.ts`가 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 무통장 입금확정은 주문 paid 전환과 판매기록 생성을 원자적으로 처리해야 하며, 중간 상태를 만들면 안 된다.
- 상태 불변조건: `awaiting_deposit` 주문만 입금확정 가능하다.
- RPC 불변조건: 직접 orders update로 우회하지 않고 `confirm_bank_transfer_order` RPC 결과를 신뢰한다.
- 더블셀 불변조건: `UNIQUE_EDITION_TAKEN`은 운영자가 구매자 환불 안내가 필요한 경합 패배로 인식할 수 있게 별도 메시지로 분기한다.
- 결과 불변조건: RPC가 artwork ids를 반환하지 않으면 판매기록 생성 실패로 보고 중단한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/deposit-confirmation.ts`
  - 관리자 무통장 입금확정 DB/RPC mutation과 작품 상태 재동기화를 담당한다.
- Create Test: `__tests__/lib/orders/deposit-confirmation.test.ts`
  - RPC 호출, 상태 guard, unique edition conflict, artwork ids 검증, 작품 상태 재동기화를 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `confirmDeposit`이 `lib/orders/deposit-confirmation.ts`를 사용하게 한다.

---

## Execution Status

2026-06-30 admin order deposit confirmation slice 완료:

- `lib/orders/deposit-confirmation.ts` 도입
  - `confirmDepositMutation`
- `app/actions/admin-orders.ts`의 `confirmDeposit` action은 admin auth/notification/audit/revalidation 중심으로 축소
- `app/actions/admin-orders.ts`는 1,081줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/deposit-confirmation.test.ts`
  - `npm test -- --runInBand __tests__/lib/orders/deposit-confirmation.test.ts __tests__/actions/admin-orders.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)

---

### Task 1: deposit confirmation module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/deposit-confirmation.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: confirmDeposit action을 domain module에 연결

- [x] **Step 1: `admin-orders.ts` migration**
- [x] **Step 2: action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3/4/5/6/7/8/9 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**
