# SAF Refactor Phase 12 Admin Order Refund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 관리자 환불 도메인 처리를 `lib/orders/admin-refund.ts`로 이동해 action을 인증, 알림, 감사로그, revalidate orchestration 중심으로 얇게 만든다.

**Architecture:** `refundOrderMutation`은 주문/결제 조회, 환불 가능 상태 검증, Toss 취소 호출 여부 판단, shared refunded lifecycle 호출, sync failure 구조화를 담당한다. `refundOrder` Server Action은 관리자 인증, 입력 trim validation, 운영 알림, 구매자 알림, 감사로그, admin path revalidate만 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, Toss cancel integration mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 관리자 환불은 Toss 자동 취소와 계좌이체 수동 환불 모두 내부 주문/결제/판매/예약 상태를 같은 제품 의도로 정리해야 한다.
- 환불 가능 상태: 관리자 환불은 `paid`, `preparing` 주문에만 허용한다.
- Toss 취소 불변조건: `payment_key`가 있고 payment status가 `CANCELED`가 아니면 주문 metadata의 provider로 Toss cancel을 호출한다.
- 이미 취소된 Toss 결제: payment status가 `CANCELED`이면 Toss 재취소를 건너뛰고 내부 refunded lifecycle만 실행한다.
- 계좌이체/수동 환불: 결제 키가 없으면 Toss API 없이 내부 refunded lifecycle을 실행한다.
- sync failure: Toss 취소 후 내부 refunded 전환 실패는 운영 알림과 audit log를 유지하고 action은 `{ success: false, error: 'ORDER_REFUND_SYNC_FAILED' }`를 반환한다.
- 부수효과 경계: domain module은 DB/Toss/lifecycle 결과만 반환하고 notification/revalidation/audit를 하지 않는다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/admin-refund.ts`
  - 관리자 환불 mutation과 관련 타입을 담당한다.
- Create Test: `__tests__/lib/orders/admin-refund.test.ts`
  - Toss 취소 호출, 이미 취소된 결제 skip, 결제키 없는 환불, 상태 guard, Toss 실패, lifecycle sync failure를 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `refundOrder`가 `refundOrderMutation`을 사용하게 하고 알림/audit/revalidate 경계를 유지한다.
- Modify: `__tests__/actions/admin-orders.test.ts`
  - source boundary assertion을 새 domain module 경계에 맞게 갱신한다.

---

## Execution Status

2026-06-30 admin order refund slice 완료:

- [x] `__tests__/lib/orders/admin-refund.test.ts` RED 추가 및 실패 확인
- [x] `lib/orders/admin-refund.ts` 구현
- [x] `app/actions/admin-orders.ts`의 `refundOrder` 연결
- [x] action source boundary test 갱신
- [x] focused tests, type-check, Phase 3-12 regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: admin refund domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/admin-refund.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: admin-orders refund action을 domain module에 연결

- [x] **Step 1: `refundOrderMutation` import**
- [x] **Step 2: 기존 환불 도메인 로직 제거 후 mutation 결과 기반 알림/audit 유지**
- [x] **Step 3: action source boundary test 갱신**
- [x] **Step 4: focused action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3-12 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED 확인:
  - `npm test -- --runInBand __tests__/lib/orders/admin-refund.test.ts`
  - expected failure: `Cannot find module '../../../lib/orders/admin-refund'`
- Focused GREEN:
  - `npm test -- --runInBand __tests__/lib/orders/admin-refund.test.ts`
  - 1 suite / 6 tests
  - `npm test -- --runInBand __tests__/lib/orders/admin-refund.test.ts __tests__/actions/admin-orders.test.ts`
  - 2 suites / 12 tests
- Phase 3-12 regression:
  - `npm test -- --runInBand __tests__/lib/orders/admin-refund.test.ts __tests__/lib/orders/admin-read-model.test.ts __tests__/lib/orders/status-transition.test.ts __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 32 suites / 179 tests
- `npm run type-check` 통과
- `npm run lint` 통과
  - 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check` 통과
