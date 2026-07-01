# SAF Refactor Phase 4 Admin Artwork Details Mutations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 create/update details DB mutation과 artist-name revalidation lookup을 `lib/artworks`로 이동해 admin action을 얇게 만든다.

**Architecture:** FormData parsing은 `lib/artworks/details-form.ts`, DB update/insert와 변경 전후 snapshot/artist lookup은 `lib/artworks/details-mutations.ts`, 관리자 인증/audit log/revalidation은 Server Action이 담당한다. 기존 `updateArtworkDetails`, `createAdminArtwork` export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 작품 create/update의 DB mutation 결과와 공개 캐시 revalidation 대상 artist name이 같은 source of truth에서 나온다.
- Update 불변조건: old/new artwork snapshot은 audit log에 사용할 수 있게 반환한다.
- Update 불변조건: 작가가 바뀌면 이전 작가명과 새 작가명을 모두 반환해 공개 작가 페이지를 갱신한다.
- Create 불변조건: 생성된 artwork와 해당 artist name을 반환해 action 응답 후 public surface revalidation 예약에 사용한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 details mutations slice 완료:

- `lib/artworks/details-mutations.ts` 도입
  - `updateAdminArtworkDetailsMutation`
  - `createAdminArtworkRecordMutation`
- `app/actions/admin-artworks.ts`의 create/update details action은 auth/log/revalidation 중심으로 축소
- `app/actions/admin-artworks.ts`는 886줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/details-mutations.ts`
  - 관리자 작품 details update/create DB mutation, snapshot, artist-name lookup을 담당한다.
- Create Test: `__tests__/lib/artworks/details-mutations.test.ts`
  - update snapshot/artistNames, create artwork/artistName 반환을 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - `updateArtworkDetails`, `createAdminArtworkRecord`가 `lib/artworks/details-mutations.ts`를 사용하게 한다.
- Modify Test: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - action이 parser와 mutation helper를 호출하는 계약으로 갱신한다.

---

### Task 1: details mutations domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/artworks/details-mutations.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: create/update details actions를 domain module에 연결

- [x] **Step 1: `admin-artworks.ts` migration**
- [x] **Step 2: source contract tests 갱신**
- [x] **Step 3: type-check로 Supabase mutation 타입 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: Phase 3/4 focused regression Jest**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
