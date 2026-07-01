# SAF Refactor Phase 15 Artwork Taken Auto Refund Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** confirm route와 Toss webhook에 중복된 동시 구매 경합 자동환불 보상 흐름을 `lib/commerce/refund-cancel/auto-refund-taken.ts`로 이동한다.

**Architecture:** `handleArtworkTakenAutoRefund`는 `ARTWORK_TAKEN` 이후 주문 refunded 마킹, 예약 해제, 공개 revalidation, Toss cancel, payments CANCELED sync, 운영자/구매자 알림을 하나의 재사용 helper로 처리한다. confirm route, DEPOSIT_CALLBACK DONE branch, STATUS_CHANGED DONE branch는 context별 label/title/reference만 넘기고 성공 알림 차단용 `contestLost = true`는 그대로 유지한다.

**Tech Stack:** Next.js Route Handlers, Supabase JS mock, Toss cancel integration mock, notification mocks, Jest, TypeScript.

## Global Constraints

- `AGENTS.md`: 사용자와 소통하거나 질문할 때는 항상 한국어를 사용한다.
- 운영 의도: 동시 구매 경합에서 결제가 캡처됐지만 작품을 줄 수 없으면 즉시 refunded 마킹과 Toss 자동환불을 시도하고, 실패 시 운영자에게 수동 환불 필요를 알린다.
- 고객 알림 불변조건: 자동환불 성공 시에만 구매자 `refunded` 이메일/SMS를 보낸다. 자동환불 실패 시에는 구매자에게 성공성 안내를 보내지 않는다.
- 주문 불변조건: helper는 `orders.status='paid'`인 행만 `refunded`로 마킹한다.
- 결제 불변조건: Toss cancel 성공 시 payments row를 `CANCELED`로 동기화한다.
- 예약/캐시 불변조건: 경합에서 사용한 salesLines artwork id를 예약 해제하고 KO/EN 상세와 공개 표면을 revalidate한다.
- 호출부 불변조건: confirm route와 webhook route의 context별 notification labels/titles/reference 문구를 보존한다.
- 부수효과 경계: helper는 `lib/commerce`에 위치하되 `app/` import를 하지 않는다.
- TDD: production code 변경 전에 helper failing test를 먼저 추가하고 실패를 확인한다.
- `npm run build`는 generated file churn을 만들 수 있으므로 이 slice 검증 명령에 포함하지 않는다.

---

## File Structure

- Create: `lib/commerce/refund-cancel/auto-refund-taken.ts`
  - 동시 구매 경합 자동환불 보상 helper와 관련 타입을 담당한다.
- Create Test: `__tests__/lib/commerce/refund-cancel/auto-refund-taken.test.ts`
  - 주문 refunded 마킹, 예약 해제/revalidate, Toss cancel 성공/실패 알림 분기를 검증한다.
- Modify: `app/api/payments/toss/confirm/route.ts`
  - `ARTWORK_TAKEN` branch가 helper를 호출하게 한다.
- Modify: `app/api/webhooks/toss/route.ts`
  - DEPOSIT_CALLBACK DONE / STATUS_CHANGED DONE의 `ARTWORK_TAKEN` branch가 helper를 호출하게 한다.
- Modify tests as needed:
  - source contract tests가 helper 경계를 인식하도록 조정한다.

---

## Execution Status

2026-06-30 artwork taken auto refund slice 완료:

- [x] `__tests__/lib/commerce/refund-cancel/auto-refund-taken.test.ts` RED 추가 및 실패 확인
- [x] `lib/commerce/refund-cancel/auto-refund-taken.ts` 구현
- [x] confirm route `ARTWORK_TAKEN` branch 연결
- [x] webhook route `ARTWORK_TAKEN` branches 연결
- [x] focused tests, type-check, Phase regression, lint, diff check 완료
- [x] `task.md`와 `walkthrough.md` 갱신

---

### Task 1: auto refund helper 도입

- [x] **Step 1: RED helper tests 추가**
- [x] **Step 2: RED 실패 확인**
- [x] **Step 3: `lib/commerce/refund-cancel/auto-refund-taken.ts` 최소 구현**
- [x] **Step 4: helper tests GREEN 확인**

### Task 2: confirm/webhook 호출부 연결

- [x] **Step 1: confirm route `ARTWORK_TAKEN` branch를 helper 호출로 교체**
- [x] **Step 2: webhook DEPOSIT_CALLBACK `ARTWORK_TAKEN` branch를 helper 호출로 교체**
- [x] **Step 3: webhook STATUS_CHANGED `ARTWORK_TAKEN` branch를 helper 호출로 교체**
- [x] **Step 4: focused app tests GREEN 확인**

### Task 3: verification and docs

- [x] **Step 1: focused Jest**
- [x] **Step 2: Phase focused regression Jest**
- [x] **Step 3: `npm run type-check`**
- [x] **Step 4: `npm run lint`**
- [x] **Step 5: `git diff --check`**
- [x] **Step 6: `task.md`와 `walkthrough.md` 갱신**

## Verification Notes

- `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/auto-refund-taken.test.ts`
  - 1 suite / 2 tests
- `npm test -- --runInBand __tests__/lib/commerce/refund-cancel/auto-refund-taken.test.ts ... __tests__/app/toss-confirm-notification-source.test.ts`
  - 37 suites / 193 tests
- `npm run type-check`
  - 통과
- `npm run lint`
  - 통과, 기존 `app/api/webhooks/funding/toss/route.ts:120` console warning 1건 유지
- `git diff --check`
  - 통과
