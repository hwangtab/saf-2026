# SAF Refactor Phase 11 Admin Order Read Model Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 관리자 주문 목록/상세 read model 조립을 `lib/orders`로 이동해 action을 admin auth orchestration 중심으로 얇게 만든다.

**Architecture:** `getOrders`와 `getOrderDetail` action은 `requireAdmin()`/`requireAdminClient()`만 담당한다. 주문 목록 쿼리, q/status filter, SLA 계산, 대표 작품 표시, 상세 line items, payment/sale join 결과 조립은 `lib/orders/admin-read-model.ts`가 담당한다. 기존 UI import 호환을 위해 `app/actions/admin-orders.ts`는 타입을 re-export한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 주문 목록/상세는 배송·입금·환불 운영 판단에 필요한 public/admin DTO를 안정적으로 보여줘야 한다.
- 조회 불변조건: 목록은 PostgREST 2,000행 상한과 virtual status filter 처리(`sla_overdue`, `escalated`)를 유지한다.
- 검색 불변조건: q filter는 PostgREST `.or()` 문법을 깨는 문자와 wildcard를 제거하고 100자 상한을 유지한다.
- 표시 불변조건: 다품목 주문은 대표 작품명 `외 N건`, 대표 이미지, 대표 작가명 표시를 유지한다.
- 상세 불변조건: payment/sale 조회, virtual account, easyPay provider, line_items, SLA 계산을 유지한다.
- 부수효과 경계: read model module은 DB read와 DTO 조립만 수행하고 notification/revalidation/audit를 하지 않는다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/admin-read-model.ts`
  - 관리자 주문 목록/상세 read model과 타입을 담당한다.
- Create Test: `__tests__/lib/orders/admin-read-model.test.ts`
  - 목록 q sanitization/SLA/다품목 대표 표시와 상세 payment/sale/line_items 조립을 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `getOrders`와 `getOrderDetail`이 `lib/orders/admin-read-model.ts`를 사용하게 한다.

---

## Execution Status

2026-06-30 admin order read model slice 완료:

- `lib/orders/admin-read-model.ts` 도입
  - `getAdminOrdersReadModel`
  - `getAdminOrderDetailReadModel`
- `app/actions/admin-orders.ts`의 `getOrders`/`getOrderDetail` action은 admin auth/read model 호출 중심으로 축소
- `app/actions/admin-orders.ts`는 726줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/admin-read-model.test.ts`
  - `npm test -- --runInBand __tests__/lib/orders/admin-read-model.test.ts __tests__/actions/admin-orders.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/admin-read-model.test.ts __tests__/lib/orders/status-transition.test.ts __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)

---

### Task 1: admin read model module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/admin-read-model.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: admin-orders read actions를 domain module에 연결

- [x] **Step 1: `getOrders` migration**
- [x] **Step 2: `getOrderDetail` migration**
- [x] **Step 3: action tests/type imports GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3-11 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**
