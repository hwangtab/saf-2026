# 이벤트 결제 reconcile 안전망 — 구현 계획

> **실행:** money-critical(환불 로직)이라 Opus 직접 TDD 구현. 설계: [docs/superpowers/specs/2026-06-16-event-payment-reconcile-design.md](../specs/2026-06-16-event-payment-reconcile-design.md)

**Goal:** 캡처됐는데 미확정인 이벤트 결제를 10분 크론이 자동 복구(좌석 있으면 확정 / 매진·만료면 환불).

**확정 결정:** ① 안티스팸 = `reconciled_at`/`reconcile_attempts` 마커 ② 환불 알림 = SMS+이메일.

---

## File Structure

- Create `lib/events/reconcile-decision.ts` — 순수 결정 함수 (테스트 가능)
- Modify `lib/events/format.ts` — `EventNotifyType`에 `'refunded'` 추가
- Modify `lib/events/notify.ts` — `'refunded'` SMS/이메일 분기
- Create `emails/event-refunded.tsx` — 환불 안내 이메일 (event-waitlist 미러)
- Create `supabase/migrations/20260616120000_event_reconcile_markers.sql` — `reconciled_at`, `reconcile_attempts`
- Create `app/api/internal/reconcile-event-registrations/route.ts` — 크론 라우트
- Modify `vercel.json` — cron 등록
- Tests: `__tests__/lib/events/reconcile-decision.test.ts`, `__tests__/app/api/internal/reconcile-event-registrations/route.test.ts`

---

## Task 1: `refunded` 알림 타입 (format + notify + email)

**Files:** `lib/events/format.ts`, `lib/events/notify.ts`, `emails/event-refunded.tsx`, test `__tests__/lib/events/format.test.ts`(있으면 확장, 없으면 생성)

- [ ] **Step 1 (test):** `buildEventAlimTalkVariables('refunded', d)` → `{ '#{name}', '#{partySize}', '#{amount}' }`, `EVENT_ALIMTALK_TEMPLATE_ENV.refunded === 'SOLAPI_KAKAO_TEMPLATE_EVENT_REFUNDED'`.
- [ ] **Step 2:** format.ts: `EventNotifyType`에 `'refunded'` 추가 → 컴파일러가 `EVENT_ALIMTALK_TEMPLATE_ENV`·`buildEventAlimTalkVariables`·notify의 `buildEventSmsText`·`EVENT_EMAIL_SUBJECTS`·`sendEventEmail` 분기 누락을 강제(exhaustive). 각각 refunded 케이스 채움.
  - SMS: `[씨앗페] ${name}님, 오윤 40주기 추도식 회비(${won(amount)}원)가 환불 처리되었습니다. 자리가 마감되어 결제분을 전액 돌려드립니다.`
  - email subject: `[씨앗페] 오윤 40주기 추도식 회비 환불 안내`
  - `emails/event-refunded.tsx`: event-waitlist.tsx 구조 복제, 환불 문구.
- [ ] **Step 3:** `npm test -- format` + `npm run type-check` (exhaustive 누락 0).
- [ ] **Step 4:** commit `feat(event): refunded 알림 타입 추가`.

## Task 2: reconcile 결정 순수 함수

**File:** `lib/events/reconcile-decision.ts`, test `__tests__/lib/events/reconcile-decision.test.ts`

```typescript
export type ReconcileAction = 'confirm' | 'refund' | 'skip';
/** 등록 상태 + Toss 상태 → 1차 행동. confirm은 pending+DONE만, expired+DONE은 곧장 refund. */
export function planEventReconcile(status: string, tossStatus: string | null): ReconcileAction {
  if (tossStatus !== 'DONE') return 'skip'; // 미캡처/이미환불 — 자가 치유
  if (status === 'pending') return 'confirm';
  if (status === 'expired') return 'refund';
  return 'skip';
}

export type ConfirmOutcome = 'confirmed' | 'refund' | 'noop' | 'alert';
/** confirm_event_registration 반환 code → 후속 행동. */
export function interpretConfirmCode(code: string | undefined): ConfirmOutcome {
  switch (code) {
    case 'CONFIRMED': return 'confirmed';
    case 'ALREADY_CONFIRMED': return 'noop';
    case 'SOLD_OUT': return 'refund';
    default: return 'alert'; // NOT_FOUND / AMOUNT_MISMATCH / INVALID_STATE
  }
}
```
- [ ] test: `planEventReconcile` 매트릭스(pending/expired/confirmed/cancelled × DONE/null/CANCELED), `interpretConfirmCode` 전 코드. → 구현 → green → commit.

## Task 3: 마이그레이션 (안티스팸 마커)

**File:** `supabase/migrations/20260616120000_event_reconcile_markers.sql`

```sql
ALTER TABLE public.event_registrations
  ADD COLUMN IF NOT EXISTS reconciled_at timestamptz,
  ADD COLUMN IF NOT EXISTS reconcile_attempts integer NOT NULL DEFAULT 0;
COMMENT ON COLUMN public.event_registrations.reconciled_at IS
  'reconcile 크론이 마지막으로 처리(확정/환불/알림)한 시각. 영구 stuck 행 알림 1회 가드.';
```
- [ ] 파일 작성 + git 보존. **production 적용은 사용자 컨펌 후 MCP `apply_migration`** (배포 전). 타입 재생성(`types/supabase.ts`)은 적용 후.

## Task 4: 크론 라우트 (money-critical 핵심)

**File:** `app/api/internal/reconcile-event-registrations/route.ts`, test `__tests__/app/api/internal/reconcile-event-registrations/route.test.ts`

핵심 로직(reconcile-payments 미러 + 이벤트 단순화):
1. `validateInternalCronRequest` → `createSupabaseAdminClient`.
2. 조회: `event_registrations` where `status in (pending,expired)` AND `created_at` ∈ [now-48h, now-5min]. (`reconcile_attempts < 5` 가드로 영구 실패행 폭주 차단.)
3. 각 행: `fetchPaymentByOrderId(order_no, 'domestic')`.
4. `planEventReconcile(status, toss?.status)`:
   - `skip` → continue.
   - `confirm` → `confirm_event_registration(order_no, toss.paymentKey, amount)` → `interpretConfirmCode`:
     - `confirmed` → `sendEventSms/Email('payment_confirmed')` + admin notify. reconciled++.
     - `noop` → continue (경합으로 confirm route가 처리).
     - `refund` → 환불 경로.
     - `alert` → `notifyEmail('error', …)` + `reconcile_attempts++`/`reconciled_at`.
   - `refund` → `cancelPayment(toss.paymentKey, {cancelReason}, 'event-reconcile-refund-'+order_no, 'domestic')`:
     - 성공 → status `cancelled`(멱등 `.eq('status', 원상태)`) + `sendEventSms/Email('refunded')` + admin notify. reconciled++.
     - 실패 → `reconcile_attempts++`, `reconciled_at=now`, 최초 1회만 `notifyEmail('error', '🚨 이벤트 환불 실패 수동')`.
5. 사이클 종료 알림(reconcile-payments 패턴): errors>0 또는 reconciled>0이면 집계 1회.
6. `runtime='nodejs'`.

- [ ] **TDD:** route.test.ts — supabase admin/`fetchPaymentByOrderId`/`cancelPayment`/notify/`confirm_event_registration` rpc 모킹. 케이스: 인증실패401 · pending+DONE→confirm→confirmed · pending+DONE→SOLD_OUT→refund · expired+DONE→refund · not-DONE→skip · refund실패→attempts++·alert1회 · 작품 orders 미접근. → 구현 → green → commit.

## Task 5: vercel.json cron

**File:** `vercel.json`
- [ ] `crons`에 `{ "path": "/api/internal/reconcile-event-registrations", "schedule": "*/10 * * * *" }` 추가(작품 reconcile 직후). → commit.

## Task 6: 통합 검증

- [ ] `npm test`(전체 green) · `npm run type-check` · `npm run build`(SSG).
- [ ] PR 생성 → CI(ci+e2e-a11y) green → 머지.
- [ ] **배포 전:** 사용자 컨펌 후 MCP `apply_migration`로 마커 컬럼 적용 → 타입 재생성. (컬럼 없으면 크론이 첫 실행에서 update 실패 → 마이그레이션 선적용 필수.)
- [ ] 알림톡 `SOLAPI_KAKAO_TEMPLATE_EVENT_REFUNDED` env는 템플릿 심사 후 등록(미등록 동안 SMS 자동대체 — 기존 패턴).

## 자체 리뷰 체크

- 스펙 커버: confirm(pending)/refund(expired,soldout)/skip/알림/안티스팸 전부 task 매핑 ✓
- 타입 일관: `ReconcileAction`/`ConfirmOutcome`/`EventNotifyType` task 간 동일 ✓
- 멱등: confirm RPC ALREADY_CONFIRMED, refund idem key, 상태 가드, Toss DONE 게이트 ✓
