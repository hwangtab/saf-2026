# SAF Refactor Phase 4 Admin Artwork Details Form Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 create/update details FormData 파싱 중복과 create-only 이미지 검증을 `lib/artworks`로 이동해 action을 얇게 만든다.

**Architecture:** 관리자 인증, DB update/insert, audit log, revalidation은 기존 Server Action 경계에 남기고, 공통 FormData 해석, limited edition 정규화, tone 정리, create image URL 검증, insert/update payload builder는 `lib/artworks/details-form.ts`가 담당한다.

**Tech Stack:** Next.js Server Actions, FormData parser unit tests, source contract tests, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 작품 등록/수정이 같은 입력 해석 규칙을 사용해야 한다.
- Form 불변조건: 제목/가격/limited edition 검증은 기존 `validateArtworkData`와 같은 메시지를 유지한다.
- Image 불변조건: 신규 작품 생성 시 draft prefix가 아닌 이미지 URL은 거부한다.
- Image 불변조건: 신규 작품 이미지는 최대 10장으로 제한한다.
- Create 불변조건: 신규 작품 생성에는 작가 선택이 필수다.
- TDD: production code 변경 전에 parser failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 details form slice 완료:

- `lib/artworks/details-form.ts` 도입
  - `parseAdminArtworkDetailsFormData`
  - `parseAdminArtworkCreateFormData`
  - `buildAdminArtworkDetailsUpdate`
  - `buildAdminArtworkCreateInsert`
- `app/actions/admin-artworks.ts`의 create/update details 중복 FormData 파싱 제거
- `app/actions/admin-artworks.ts`는 931줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/details-form.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/details-form.ts`
  - 관리자 작품 create/update FormData parser와 payload builder를 담당한다.
- Create Test: `__tests__/lib/artworks/details-form.test.ts`
  - shared field normalization, edition fallback, create image validation, artist requirement를 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - `updateArtworkDetails`, `createAdminArtworkRecord`가 parser/payload builder를 사용하게 한다.
- Modify Test: `__tests__/app/admin-artwork-create-image-upload-source.test.ts`
  - 이미지 검증 정책이 action이 아니라 helper에 존재하고 action이 helper를 호출하는 계약으로 갱신한다.

---

### Task 1: details form helper 도입

- [x] **Step 1: RED parser tests 추가**
- [x] **Step 2: `lib/artworks/details-form.ts` 최소 구현**
- [x] **Step 3: parser tests GREEN 확인**

### Task 2: create/update actions를 parser helper에 연결

- [x] **Step 1: `admin-artworks.ts` migration**
- [x] **Step 2: source contract tests 갱신**
- [x] **Step 3: type-check로 Supabase payload 타입 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: Phase 3/4 focused regression Jest**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
