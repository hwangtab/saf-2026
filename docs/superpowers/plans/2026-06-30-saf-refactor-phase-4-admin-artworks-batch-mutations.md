# SAF Refactor Phase 4 Admin Artwork Batch Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 작품 단건 삭제, 일괄 숨김/삭제 DB mutation과 삭제 정책을 `lib/artworks`로 이동해 admin action을 얇게 만든다.

**Architecture:** 관리자 인증, audit log, revalidation은 Server Action에 남기고, row 조회/업데이트/삭제, active order guard, missing id partial result, FK 삭제 실패 안내 메시지는 `lib/artworks/batch-mutations.ts`가 담당한다. 기존 `deleteAdminArtwork`, `batchToggleHidden`, `batchDeleteArtworks` export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 삭제 가능한 작품과 숨김 처리해야 하는 작품의 차이를 운영자가 예측할 수 있게 한다.
- 삭제 불변조건: 진행 중인 주문이 연결된 작품은 삭제하지 않는다.
- 삭제 불변조건: 과거 주문/판매 이력 FK 때문에 삭제가 막히면 raw DB 오류가 아니라 숨김 처리 안내 메시지를 낸다.
- Batch 불변조건: 요청 id 일부가 없으면 실제 삭제된 id만 성공으로 보고하고 missing id는 partial failure로 반환한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 batch mutation slice 완료:

- `lib/artworks/batch-mutations.ts` 도입
  - `deleteArtworkMutation`
  - `batchToggleArtworkHiddenMutation`
  - `batchDeleteArtworksMutation`
  - 공통 `BatchArtworkMutationResult` type export
- `app/actions/admin-artworks.ts`의 `deleteAdminArtwork`, `batchToggleHidden`, `batchDeleteArtworks`는 auth/log/revalidation 중심으로 축소
- `app/actions/admin-artworks.ts`는 이후 admin tags slice까지 포함해 1,088줄까지 감소
- focused 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/batch-mutations.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-artworks-status.test.ts`
- 최종 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run type-check`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/batch-mutations.ts`
  - 단건 삭제, 일괄 숨김 update, 일괄 삭제 조회/가드/delete, partial result를 담당한다.
- Create Test: `__tests__/lib/artworks/batch-mutations.test.ts`
  - single delete revalidation data, visibility snapshot, missing id partial result, active order guard, FK 23503 안내 메시지를 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - `deleteAdminArtwork`, `batchToggleHidden`, `batchDeleteArtworks`가 `lib/artworks/batch-mutations.ts`를 사용하게 한다.
- Keep: `__tests__/actions/admin-artworks-delete.test.ts`
  - action surface의 기존 active-order/FK/missing-id 계약을 유지한다.

---

### Task 1: batch mutations domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/artworks/batch-mutations.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: admin batch actions를 domain module에 연결

- [x] **Step 1: `admin-artworks.ts` migration**
- [x] **Step 2: 기존 action tests GREEN 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3/4 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
