# SAF Refactor Phase 13 Admin Awaiting Cancel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `admin-orders.ts`의 입금대기 관리자 취소 도메인 처리를 `lib/orders/admin-awaiting-cancel.ts`로 이동해 action을 인증, 알림, 감사로그, revalidate orchestration 중심으로 얇게 만든다.

**Architecture:** `cancelAwaitingOrderMutation`은 주문 조회, `awaiting_deposit` 상태 guard, shared awaiting cancel lifecycle 호출, lifecycle 실패 매핑을 담당한다. `cancelAwaitingOrder` Server Action은 관리자 인증, cancel reason validation, 예약 해제 실패 운영 알림, 구매자 취소 알림, 감사로그, admin path revalidation만 담당한다.

**Tech Stack:** Next.js Server Actions, Supabase JS mock, shared refund/cancel lifecycle mock, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 입금대기 관리자 취소는 주문 상태, 예약 해제, 공개 캐시 갱신을 shared lifecycle 기준으로 유지해야 한다.
- 취소 가능 상태: 관리자 입금대기 취소는 `awaiting_deposit` 주문에만 허용한다.
- 상태 경합: shared lifecycle의 0-row update는 `주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.`로 유지한다.
- 부수효과 경계: domain module은 DB/lifecycle 결과만 반환하고 notification/admin audit/admin revalidation을 하지 않는다.
- TDD: production code 변경 전에 domain failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/orders/admin-awaiting-cancel.ts`
  - 관리자 입금대기 취소 mutation과 관련 타입을 담당한다.
- Create Test: `__tests__/lib/orders/admin-awaiting-cancel.test.ts`
  - 주문 조회, 상태 guard, shared lifecycle 호출, lifecycle 실패 매핑을 검증한다.
- Modify: `app/actions/admin-orders.ts`
  - `cancelAwaitingOrder`가 `cancelAwaitingOrderMutation`을 사용하게 하고 알림/audit/revalidation 경계를 유지한다.
- Modify: `__tests__/actions/admin-orders.test.ts`
  - source boundary assertion을 새 domain module 경계에 맞게 갱신한다.

---

## Execution Status

2026-06-30 admin awaiting cancel slice 완료:

- [x] `__tests__/lib/orders/admin-awaiting-cancel.test.ts` RED 추가 및 실패 확인
- [x] `lib/orders/admin-awaiting-cancel.ts` 구현
- [x] `app/actions/admin-orders.ts`의 `cancelAwaitingOrder` 연결
- [x] action source boundary test 갱신
- [x] focused tests, type-check, Phase 3-13 regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: admin awaiting cancel domain module 도입

- [x] **Step 1: RED domain tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/orders/admin-awaiting-cancel.ts` 최소 구현**
- [x] **Step 4: domain tests GREEN 확인**

### Task 2: admin-orders cancelAwaitingOrder action을 domain module에 연결

- [x] **Step 1: `cancelAwaitingOrderMutation` import**
- [x] **Step 2: 기존 주문 조회/상태 guard/lifecycle 호출 제거 후 mutation 결과 기반 알림/audit 유지**
- [x] **Step 3: action source boundary test 갱신**
- [x] **Step 4: focused action tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase 3-13 focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- RED 확인:
  - `npm test -- --runInBand __tests__/lib/orders/admin-awaiting-cancel.test.ts`
  - expected failure: `Cannot find module '../../../lib/orders/admin-awaiting-cancel'`
- Focused GREEN:
  - `npm test -- --runInBand __tests__/lib/orders/admin-awaiting-cancel.test.ts`
  - 1 suite / 4 tests
  - `npm test -- --runInBand __tests__/lib/orders/admin-awaiting-cancel.test.ts __tests__/actions/admin-orders.test.ts`
  - 2 suites / 10 tests
- Phase 3-13 regression:
  - `npm test -- --runInBand __tests__/lib/orders/admin-awaiting-cancel.test.ts __tests__/lib/orders/admin-refund.test.ts __tests__/lib/orders/admin-read-model.test.ts __tests__/lib/orders/status-transition.test.ts __tests__/lib/orders/deposit-confirmation.test.ts __tests__/lib/orders/public-lookup.test.ts __tests__/lib/orders/buyer-cancel.test.ts __tests__/lib/orders/buyer-mutations.test.ts __tests__/lib/orders/admin-mutations.test.ts __tests__/app/deposit-auto-cancel-pause-guard.test.ts __tests__/lib/admin-artwork-tags.test.ts __tests__/lib/artworks/admin-tags.test.ts __tests__/lib/artworks/core-mutations.test.ts __tests__/lib/artworks/details-form.test.ts __tests__/lib/artworks/details-mutations.test.ts __tests__/lib/artworks/sales.test.ts __tests__/lib/artworks/status-mutations.test.ts __tests__/lib/artworks/batch-mutations.test.ts __tests__/lib/commerce/layer-boundary.test.ts __tests__/lib/commerce/payment-lifecycle/mark-order-paid.test.ts __tests__/lib/commerce/refund-cancel/mark-order-refunded.test.ts __tests__/lib/commerce/refund-cancel/cancel-awaiting-order.test.ts __tests__/actions/admin-artworks-status.test.ts __tests__/actions/admin-artworks-delete.test.ts __tests__/actions/admin-orders.test.ts __tests__/actions/order-lookup.test.ts __tests__/app/admin-artwork-create-image-upload-source.test.ts __tests__/app/admin-artwork-create-revalidate-contract.test.ts __tests__/app/reconcile-payments-backfill-contract.test.ts __tests__/app/toss-confirm-payment-record-failure.test.ts __tests__/app/toss-confirm-virtual-account-reservation.test.ts __tests__/app/toss-webhook-status-changed-missing-payment.test.ts __tests__/app/toss-webhook-deposit-callback-missing-payment.test.ts`
  - 33 suites / 183 tests
- `npm run type-check` 통과
- `npm run lint` 통과
  - 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check` 통과
