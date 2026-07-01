# SAF Refactor Phase 4 Admin Artwork Sales Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-artworks.ts`의 판매 기록 조회/생성/수정/void 도메인 로직을 `lib/artworks`로 이동해 admin action을 얇게 만든다.

**Architecture:** FormData 파싱, admin auth, audit log, admin route revalidation은 Server Action에 남기고, `artwork_sales` 조회/insert/update/void, edition capacity 검증, artwork status 재동기화는 `lib/artworks/sales.ts`가 담당한다. 기존 UI action 함수명과 반환 shape는 유지한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자가 한 달 뒤 판매 기록과 작품 상태 전이를 예측할 수 있게 도메인 불변조건을 중앙화한다.
- 판매 불변조건: limited edition은 active non-voided sales 기준으로 edition limit을 초과할 수 없다.
- 판매 불변조건: Toss/source 동기화 판매 기록은 관리자 수동 수정으로 바꾸지 않는다.
- 상태 불변조건: 판매 기록 생성/수정/void 이후 `deriveAndSyncArtworkStatus(...)`를 실행한다.
- TDD: production code 변경 전에 관련 failing test를 먼저 추가하거나 기존 source-contract test가 실패하는 것을 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 Phase 검증 명령에 포함하지 않는다.

## Execution Status

2026-06-30 Phase 4 sales/status slice 완료:

- `lib/artworks/sales.ts` 도입: sales 조회, manual sale 생성/수정/void, edition capacity 검증, status sync 담당
- `lib/artworks/status-mutations.ts` 도입: `batchUpdateArtworkStatus` DB mutation 담당
- `app/actions/admin-artworks.ts`는 판매/상태 action에서 auth, FormData parsing, audit log, revalidation 중심으로 축소
- `app/actions/admin-artworks.ts`는 1,367줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run type-check`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)
  - `git diff --check`

---

## File Structure

- Create: `lib/artworks/sales.ts`
  - `artwork_sales` 조회, manual sale 생성/수정/void, edition capacity 검증, status sync를 담당한다.
- Create Test: `__tests__/lib/artworks/sales.test.ts`
  - limited edition cap, Toss source update block, void status sync를 검증한다.
- Modify: `app/actions/admin-artworks.ts`
  - `getArtworkSales`, `recordArtworkSale`, `updateArtworkSale`, `voidArtworkSale`이 `lib/artworks/sales.ts`를 사용하게 한다.
- Modify Test: `__tests__/app/admin-artwork-create-revalidate-contract.test.ts`
  - 판매 action이 domain helper를 사용하면서 revalidation contract를 유지하는지 확인한다.

---

### Task 1: artwork sales domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: `lib/artworks/sales.ts` 최소 구현**
- [x] **Step 3: domain tests GREEN 확인**

### Task 2: admin sale actions를 domain module에 연결

- [x] **Step 1: RED source contract 추가**
- [x] **Step 2: `admin-artworks.ts` migration**
- [x] **Step 3: action/source tests GREEN 확인**

### Task 3: verification

- [x] **Step 1: focused Jest**
- [x] **Step 2: `npm run type-check`**
- [x] **Step 3: `npm run lint`**
- [x] **Step 4: `git diff --check`**
