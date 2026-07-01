# SAF Refactor Phase 8 Public Order Lookup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `order-lookup.ts`의 구매자 주문 목록/상세 read model 조립을 `lib/orders`로 이동해 action을 rate limit, 세션, 권한 검증 중심으로 얇게 만든다.

**Architecture:** `lookupOrders`, `lookupOrderDetail`, `lookupOrderByToken` action은 요청 제한과 인증/권한 판정만 담당한다. 목록 쿼리, 전화번호 검증, 대표 작품 표시, 결제수단/가상계좌/무통장 계좌 표시 조립은 `lib/orders/public-lookup.ts`가 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 구매자 주문조회 화면은 이메일/전화번호/토큰/세션 권한에 따라 같은 public DTO를 안정적으로 보여줘야 한다.
- 권한 불변조건: domain read model은 권한 판정을 하지 않고, action이 이메일/세션/토큰 권한을 판정한다.
- 조회 불변조건: 주문 목록은 전화번호 정규화 검증을 통과한 주문만 반환한다.
- 표시 불변조건: 다품목 주문은 locale에 맞는 대표 작품명(`외 N건`/`and N more`)과 대표 이미지를 유지한다.
- 입금정보 불변조건: `manual_bank_transfer` 입금대기 주문은 Toss virtualAccount와 섞지 않고 metadata/env 무통장 표시값을 반환한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/public-lookup.ts`
  - 구매자 주문 목록/상세 public read model과 타입을 담당한다.
- Create Test: `__tests__/lib/orders/public-lookup.test.ts`
  - 전화번호 검증 목록 조회, 다품목 표시, manual bank transfer 상세 표시를 검증한다.
- Modify: `app/actions/order-lookup.ts`
  - 조회 action이 `lib/orders/public-lookup.ts`를 사용하게 한다.

---

## Execution Status

2026-06-30 public order lookup slice 완료:

- `lib/orders/public-lookup.ts` 도입
  - `lookupPublicOrdersByBuyer`
  - `fetchPublicOrderDetailRow`
- `app/actions/order-lookup.ts`의 조회 action은 rate limit/session/token auth 중심으로 축소
- `app/actions/order-lookup.ts`는 502줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/public-lookup.test.ts`
  - `npm test -- --runInBand __tests__/lib/orders/public-lookup.test.ts __tests__/actions/order-lookup.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)

---

### Task 1: public lookup module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/public-lookup.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: order lookup actions를 domain module에 연결

- [x] **Step 1: `lookupOrders` migration**
- [x] **Step 2: `lookupOrderDetail`/`lookupOrderByToken` migration**
- [x] **Step 3: action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3/4/5/6/7/8 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**
