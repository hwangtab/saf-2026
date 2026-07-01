# SAF Refactor Phase 5 Admin Order Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 작은 관리자 주문 mutation을 `lib/orders`로 이동해 action을 얇게 만든다.

**Architecture:** 관리자 인증, audit log, revalidation은 Server Action에 남기고, 배송정보 수정, 입금대기 자동취소 보류, 에스컬레이션 낙관적 잠금/메모 저장은 `lib/orders/admin-mutations.ts`가 담당한다. 기존 `updateTrackingInfo`, `setDepositAutoCancelPaused`, `setOrderEscalation` export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 주문 화면에서 반복적으로 쓰는 작은 상태 변경 정책을 action 파일에서 분리한다.
- 배송 불변조건: 운송장 수정은 `shipped`/`delivered` 주문에만 허용한다.
- 입금대기 불변조건: 자동취소 보류는 `awaiting_deposit` 주문에만 허용하고, 상태 낙관적 잠금이 실패하면 충돌 메시지를 낸다.
- 에스컬레이션 불변조건: `escalated_at`은 낙관적 잠금으로 변경하고, 메모는 `order_admin_notes`에 별도 저장/삭제한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 admin order mutations slice 완료:

- `lib/orders/admin-mutations.ts` 도입
  - `updateTrackingInfoMutation`
  - `setDepositAutoCancelPausedMutation`
  - `setOrderEscalationMutation`
- `app/actions/admin-orders.ts`의 세 action은 auth/log/revalidation 중심으로 축소
- `app/actions/admin-orders.ts`는 1,135줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/admin-mutations.test.ts __tests__/actions/admin-orders.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/orders/admin-mutations.ts`
  - 관리자 주문 소형 mutation과 낙관적 잠금 정책을 담당한다.
- Create Test: `__tests__/lib/orders/admin-mutations.test.ts`
  - 배송 상태 제한, 자동취소 보류 상태 제한/충돌, 에스컬레이션 upsert/delete를 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `updateTrackingInfo`, `setDepositAutoCancelPaused`, `setOrderEscalation`이 `lib/orders/admin-mutations.ts`를 사용하게 한다.

---

### Task 1: admin order mutation module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/orders/admin-mutations.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: admin order actions를 domain module에 연결

- [x] **Step 1: `admin-orders.ts` migration**
- [x] **Step 2: focused action/source tests GREEN 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: Phase 3/4/5 focused regression Jest**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
