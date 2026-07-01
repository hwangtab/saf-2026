# SAF Refactor Phase 4 Admin Artwork Core Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 이미지/카테고리 DB mutation과 storage cleanup 정책을 `lib/artworks`로 이동해 admin action을 얇게 만든다.

**Architecture:** 관리자 인증, audit log, public/admin revalidation은 Server Action에 남기고, `artworks` row update, 이미지 낙관적 잠금, 삭제된 storage path 계산/삭제, category snapshot은 `lib/artworks/core-mutations.ts`가 담당한다. 기존 `updateArtworkImages`, `updateArtworkCategory` export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 두 관리자가 동시에 이미지를 편집해도 새로 저장된 이미지가 orphan cleanup으로 지워지지 않아야 한다.
- 이미지 불변조건: `updated_at` 낙관적 잠금이 실패하면 storage remove를 호출하지 않는다.
- 이미지 불변조건: UPDATE 성공 후에만 제거된 이미지 URL의 artwork variant paths를 삭제한다.
- 카테고리 불변조건: audit log가 이전 카테고리를 기록할 수 있게 update 전 snapshot을 반환한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 core mutations slice 완료:

- `lib/artworks/core-mutations.ts` 도입
  - `updateArtworkImagesMutation`
  - `updateArtworkCategoryMutation`
- `app/actions/admin-artworks.ts`의 이미지/카테고리 action은 auth/log/revalidation 중심으로 축소
- focused 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/core-mutations.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - `npm run type-check`
- 최종 검증 완료:
  - `npm test -- --runInBand __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/core-mutations.ts`
  - 이미지 낙관적 update, storage cleanup, category update snapshot을 담당한다.
- Create Test: `__tests__/lib/artworks/core-mutations.test.ts`
  - optimistic lock success/failure, storage cleanup guard, category snapshot을 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - `updateArtworkImages`, `updateArtworkCategory`가 `lib/artworks/core-mutations.ts`를 사용하게 한다.

---

### Task 1: core mutations domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/artworks/core-mutations.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: admin core actions를 domain module에 연결

- [x] **Step 1: `admin-artworks.ts` migration**
- [x] **Step 2: existing revalidation source contract GREEN 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: Phase 3/4 focused regression Jest**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
