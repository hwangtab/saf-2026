# SAF Refactor Phase 4 Admin Artwork Tags Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 관리자 내부 태그 조회/CRUD/작품 연결 mutation을 `lib/artworks`로 이동해 admin action을 얇게 만든다.

**Architecture:** 관리자 인증, audit log, admin route revalidation은 Server Action에 남기고, `admin_tags`/`artwork_admin_tags` 조회 및 mutation, archived tag 정책, duplicate slug 정책, attach 실패 rollback은 `lib/artworks/admin-tags.ts`가 담당한다. 기존 action export와 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 내부 태그가 보관/복원/삭제/작품 연결 상태에서 예측 가능한 정책을 갖게 한다.
- 태그 불변조건: 보관 처리된 동일 slug 태그가 있으면 새 태그 생성 대신 복원/수정 안내를 낸다.
- 태그 불변조건: 보관 처리된 태그는 수정하거나 작품에 추가할 수 없다.
- attach 불변조건: 새 태그 생성 후 작품 연결이 실패하면 생성된 태그를 보관 처리해 노출 쓰레기를 남기지 않는다.
- bulk add 불변조건: 같은 작품 id가 중복 전달되어도 `artwork_admin_tags` upsert row는 고유 작품 id 기준으로 만든다.
- delete 불변조건: 영구 삭제 전 연결 snapshot과 고유 artwork ids를 반환해 audit/revalidation에 사용한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 admin tags slice 완료:

- `lib/artworks/admin-tags.ts` 도입
  - `listAdminTags`
  - `listArtworkAdminTags`
  - `createAdminTagMutation`
  - `updateAdminTagMutation`
  - `archiveAdminTagMutation`
  - `restoreAdminTagMutation`
  - `deleteAdminTagMutation`
  - `createAndAttachAdminTagToArtworkMutation`
  - `addAdminTagToArtworksMutation`
  - `removeAdminTagFromArtworksMutation`
- `app/actions/admin-artworks.ts`의 태그 action은 auth/log/revalidation 중심으로 축소
- `app/actions/admin-artworks.ts`는 태그 slice 직후 1,132줄까지 감소했고, 이후 단건 삭제 slice까지 포함해 1,088줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/admin-artwork-tags.test.ts`
  - `npm test -- --runInBand __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run type-check`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/admin-tags.ts`
  - 관리자 태그 조회/CRUD, 작품 연결 add/remove, 생성 후 attach rollback을 담당한다.
- Create Test: `__tests__/lib/artworks/admin-tags.test.ts`
  - archived duplicate, archived update block, attach rollback, bulk add dedupe, delete snapshot을 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - 태그 action들이 `lib/artworks/admin-tags.ts`를 사용하게 한다.

---

### Task 1: admin tags domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/artworks/admin-tags.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: admin tag actions를 domain module에 연결

- [x] **Step 1: `admin-artworks.ts` migration**
- [x] **Step 2: type-check로 action/UI 반환 타입 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3/4 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
