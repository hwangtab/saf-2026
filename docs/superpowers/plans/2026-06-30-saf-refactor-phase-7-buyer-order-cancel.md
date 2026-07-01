# SAF Refactor Phase 7 Buyer Order Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `order-lookup.ts`의 구매자 셀프 취소 흐름을 `lib/orders` domain module로 분리해 action을 rate limit, 세션, 알림, 로그 orchestration 중심으로 얇게 만든다.

**Architecture:** `cancelBuyerOrder` action은 요청 제한, 입력 길이 guard, 세션 조회, 부수효과 실행을 담당한다. 주문 조회, 소유권 검증, 취소 가능 상태 판단, Toss 취소 호출, shared refund/cancel lifecycle 실행은 `lib/orders/buyer-cancel.ts`가 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Toss cancel adapter, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 구매자가 직접 취소할 때 외부 결제 취소와 내부 주문/판매/예약 상태가 어긋나면 안 된다.
- 권한 불변조건: 로그인 owner는 이메일 없이 취소 가능하지만, 비로그인 사용자는 주문 이메일과 일치해야 한다.
- 상태 불변조건: 구매자 셀프 취소는 `paid`와 `awaiting_deposit`만 허용한다.
- 입금대기 불변조건: `awaiting_deposit`은 Toss 취소 없이 shared 입금대기 취소 lifecycle로 주문 취소와 예약 해제를 처리한다.
- 결제완료 불변조건: `paid`는 Toss 취소 성공 이후 shared refund/cancel lifecycle로 내부 `refunded` 동기화를 처리한다.
- 오류 불변조건: Toss 취소 성공 후 내부 상태 동기화 실패는 action이 운영자 알림/감사 로그를 남길 수 있도록 structured failure로 반환한다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/buyer-cancel.ts`
  - 구매자 셀프 취소의 주문 조회, 권한/상태 검증, Toss 취소, shared lifecycle 호출을 담당한다.
- Create Test: `__tests__/lib/orders/buyer-cancel.test.ts`
  - owner/email 권한, awaiting deposit lifecycle, paid Toss cancel + refund lifecycle, failure mapping을 검증한다.
- Modify: `app/actions/order-lookup.ts`
  - `cancelBuyerOrder`가 `lib/orders/buyer-cancel.ts`를 사용하게 한다.

---

## Execution Status

2026-06-30 buyer order cancel slice 완료:

- `lib/orders/buyer-cancel.ts` 도입
  - `cancelBuyerOrderMutation`
- `app/actions/order-lookup.ts`의 `cancelBuyerOrder` action은 rate limit/session/notification/audit orchestration 중심으로 축소
- `app/actions/order-lookup.ts`는 864줄까지 감소
- 검증 완료:
  - `npm test -- --runInBand __tests__/lib/orders/buyer-cancel.test.ts`
  - `npm test -- --runInBand __tests__/lib/orders/buyer-cancel.test.ts __tests__/actions/order-lookup.test.ts`
  - `npm run type-check`
  - `npm test -- --runInBand __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - `npm run lint` (exit 0, 기존 funding webhook console warning 1건 유지)

---

### Task 1: buyer cancel domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/buyer-cancel.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: cancelBuyerOrder action을 domain module에 연결

- [x] **Step 1: `order-lookup.ts` migration**
- [x] **Step 2: action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3/4/5/6/7 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**
