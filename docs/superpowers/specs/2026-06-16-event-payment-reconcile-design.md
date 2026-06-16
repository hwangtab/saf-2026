# 이벤트 결제 reconcile 안전망 설계

> **상태:** 설계 승인 대기 (브레인스토밍 산출물). 승인 후 `superpowers:writing-plans`로 구현 계획 작성.

**Goal:** 추도식(이벤트) 결제가 "캡처됐는데 미확정" 상태로 방치되는 것을 자동 복구하는 reconcile 크론을 추가한다 — 좌석 있으면 확정, 매진이면 환불.

**Tech Stack:** Next.js 16 route handler (nodejs runtime), Vercel Cron, Supabase service-role RPC, Toss Payments API (`fetchPaymentByOrderId`, `cancelPayment`).

---

## 1. 배경 — 안전망 공백

이벤트 결제 흐름(`app/api/payments/event/confirm/route.ts`):

1. `confirmPayment(...)` — **Toss 서버 캡처(돈 빠짐)**
2. `confirm_event_registration` RPC — 좌석 원자적 확정 (`pending → confirmed`)
3. RPC 실패 시 → `cancelPayment` 자동환불 → `cancelled`(환불성공) / `expired`(환불실패)

**위험 구간(캡처 성공 후):**

| 시나리오 | 결과 상태 | 돈 | 좌석 | 알림 |
| --- | --- | --- | --- | --- |
| RPC 실패 + 자동환불 실패 | `expired` | 빠짐 | 없음 | 있음(수동 알림) |
| 캡처 후 라우트 크래시/타임아웃 (RPC·환불 전) | `pending` 잔류 | 빠짐 | 없음 | **없음** |

작품 주문은 이 구간을 **웹훅(STATUS_CHANGED DONE) + `reconcile-payments` 크론(10분)** 이 자동 보정한다. 이벤트는 둘 다 없다(웹훅은 2026-06-15 PR #119로 ack-ignore 처리 — 이벤트 결제를 작품 웹훅이 잘못 처리하던 회귀 차단). 즉 이벤트엔 confirm-route 실패용 자동 복구가 전무하다.

## 2. 현재 상태 (현실 정박)

- **현재 막힌 이벤트 결제 0건** (2026-06-16 확인): `pending` 2건은 `payment_key=null`(미캡처=돈 안 빠짐), 나머지 confirmed/cancelled 정상. → **예방적 설계**(희소 케이스). 과설계 금지.
- **재사용 인프라 존재**: `app/api/internal/reconcile-payments/route.ts`가 동일 패턴(`fetchPaymentByOrderId` → Toss DONE이면 보정, 멱등). Vercel cron 스케줄(`vercel.json`), `validateInternalCronRequest` 인증, `cancelPayment`/Toss 헬퍼 모두 갖춰짐.

## 3. 채택 접근 — 이벤트 전용 reconcile 크론

**신규 라우트** `app/api/internal/reconcile-event-registrations/route.ts`, **10분 주기** Vercel Cron. 작품 `reconcile-payments` 패턴을 미러하되 이벤트는 더 단순(작품 매출/예약/다품목 없음).

대안 대비 선택 이유:
- **vs 이벤트 인지 웹훅:** 방금 단순화한 money-critical 웹훅에 이벤트 로직을 재결합하지 않는다(결합도·리스크↑). 10분 지연은 희소 케이스에 무방.
- **vs 수동 admin 도구:** 자동 복구가 운영 부담 0. (단 영구 환불불가 tail은 여전히 수동 — §5.6.)
- **vs 작품 크론 확장:** 작품 라우트(330줄)는 이미 작품 전용 로직으로 큼. 단일 책임 분리가 명확.

## 4. 복구 정책 (공통 — 기존 confirm route 미러)

캡처(Toss DONE)됐는데 미확정인 등록 발견 시:
- **좌석 있으면 확정** — `confirm_event_registration`(멱등) 재호출.
- **매진이면 환불** — `cancelPayment`(domestic; 카드 결제라 환불계좌 불필요).
- **환불 실패 시에만** 운영팀 수동 알림.

## 5. 상세 설계

### 5.1 라우트 · 스케줄 · 인증

- `GET /api/internal/reconcile-event-registrations`, `export const runtime = 'nodejs'`.
- 진입 즉시 `validateInternalCronRequest(request)` — 실패 시 그 응답 반환(작품 크론과 동일).
- `createSupabaseAdminClient()` (service-role — RPC가 `auth.role()='service_role'` 강제).
- `vercel.json` crons에 `{ "path": "/api/internal/reconcile-event-registrations", "schedule": "*/10 * * * *" }` 추가.

### 5.2 대상 조회

```
status IN ('pending','expired')
AND created_at BETWEEN (now - 48h) AND (now - 5min)
```
- **하한 5분:** 진행 중 결제(정상 confirm 흐름)를 건드리지 않음.
- **상한 48시간:** 고대 잔류 행 무한 재처리 방지(행사 특성상 충분). 그 밖은 admin 수동.
- 0건이면 즉시 `{ reconciled: 0, checked: 0 }`.
- 조회 컬럼: `id, order_no, status, amount, party_size, applicant_name, phone, email, hold_expires_at`.

### 5.3 Toss 권위 조회 (모든 행위의 게이트)

각 행마다 `fetchPaymentByOrderId(order_no, 'domestic')`:
- `null` 또는 `status !== 'DONE'` → **skip**(미캡처이거나 이미 환불/취소 → 자가 치유로 빠짐).
- `DONE` → 캡처 확정. §5.4 진입.

> `order_no`(=`EVT-…`)는 confirmPayment에 넘긴 Toss orderId라 orderId 조회 엔드포인트로 권위 확인 가능. provider는 **항상 `'domestic'`**(이벤트 MID saf202i818 고정).

### 5.4 상태별 복구 분기

**`pending` + Toss DONE:**
- `confirm_event_registration(order_no, tossPayment.paymentKey, amount)` 호출. 반환 코드:
  - `CONFIRMED` → 확정 완료. 고객 `payment_confirmed` 알림(SMS/이메일) + admin 통지.
  - `ALREADY_CONFIRMED` → no-op(경합으로 confirm route가 먼저 끝낸 경우). skip.
  - `SOLD_OUT` → **환불 경로**(아래)로.
  - `AMOUNT_MISMATCH` / `INVALID_STATE` / `NOT_FOUND` → 비정상. 운영팀 에러 알림(자동 처리 금지).

**`expired` + Toss DONE:**
- RPC는 `pending`만 confirm(그 외 `INVALID_STATE`)하므로 `expired`는 **확정 불가** — 이미 시스템이 "확정 실패 + 환불 실패"로 판정한 건이다. → **환불 재시도** 경로로.

**환불 경로 (`SOLD_OUT` 또는 `expired`):**
- `cancelPayment(paymentKey, { cancelReason }, idemKey, 'domestic')`, `idemKey = event-reconcile-refund-${order_no}`.
- 성공 → `event_registrations.status = 'cancelled'`(멱등 가드 `.eq('status', <원상태>)`), 고객 `refunded` 알림 + admin 통지.
- 실패 → `expired` 유지, 운영팀 **🚨 수동 환불 필요** 알림(§5.6 안티스팸 적용).

### 5.5 알림

- **`payment_confirmed`** — 기존 `sendEventSms/sendEventEmail('payment_confirmed', …)` 재사용.
- **`refunded`** — **신규 타입 추가 필요**. 현재 `EventNotifyType = 'payment_confirmed' | 'waitlist' | 'waitlist_payment'`에 `'refunded'` 없음. `lib/events/format.ts`(SMS/이메일 본문) + `lib/events/notify.ts`(제목·발송) + 알림톡 템플릿(미승인 시 SMS 자동대체, 기존 패턴)에 추가. 최소: 환불 안내 SMS + 이메일.
- **admin** — `notifyEmail('warning'|'error', …)`로 확정/환불/실패 결과 통지. 작품 크론처럼 사이클 끝에 `reconciled`/`errors` 집계 1회 발송.

### 5.6 멱등성 · 안티스팸 · 안전

- **confirm 멱등:** RPC가 `ALREADY_CONFIRMED` 반환(중복 무해).
- **refund 멱등:** `cancelPayment` idempotency key로 중복 환불 차단.
- **Toss 게이트:** DONE인 건만 행위 → 이미 환불된 건(CANCELED)은 자동 skip. 성공 복구는 상태 전이로 쿼리에서 빠짐(자가 치유).
- **영구 stuck tail(환불 계속 실패):** `expired`로 남아 매 사이클 재처리·재알림 → 스팸 위험. **결정 필요(§8):** 권장은 nullable `reconciled_at timestamptz` + `reconcile_attempts int` 마커 추가 — 환불은 매 사이클 재시도하되 **알림은 최초 1회**(이후 admin 목록으로만 노출). 또는 48h 윈도우 + 행사 규모상 ~0건이므로 주기 재알림 허용(스키마 무변경). 트레이드오프는 구현 계획에서 확정.
- **동시성:** confirm route와 크론이 같은 행을 동시에 → RPC `FOR UPDATE` + 상태 가드로 한쪽만 성공. 무해.

## 6. 데이터 모델

- **스키마 변경 없음**이 기본(상태 전이로 자가 치유). 단 §5.6 안티스팸으로 `reconciled_at`/`reconcile_attempts` 채택 시 `event_registrations`에 nullable 컬럼 1~2개 추가(마이그레이션 1건, MCP `apply_migration`). status enum/check 변경은 하지 않음.

## 7. 엣지 케이스

- **부분 환불·외화:** 해당 없음(이벤트는 단일 금액 카드 전액).
- **hold 만료된 pending + 좌석 여유:** RPC가 재계산해 좌석 있으면 확정, 없으면 SOLD_OUT → 환불. 정상 동작.
- **confirm route와 경합:** §5.6 동시성 가드로 안전.
- **Toss 일시 장애:** `fetchPaymentByOrderId` null → skip, 다음 사이클 재시도(작품 크론과 동일 내성).
- **이미 cancelled/confirmed로 끝난 행:** 쿼리 `status IN (pending,expired)`에서 제외 → 무처리.

## 8. 미해결 질문 (구현 계획 전 확정)

1. **안티스팸 방식:** (A) `reconciled_at`/`reconcile_attempts` 마커 추가(알림 1회) vs (B) 스키마 무변경 + 주기 재알림 허용(행사 규모상 수용). → 기본 권장 (A) 경량 마커.
2. **`refunded` 고객 알림 범위:** SMS+이메일 둘 다 vs SMS만. (기존 알림톡 템플릿 심사 대기 상태와 정합 — 미승인 시 SMS 대체.)

## 9. 범위 밖 / 후속

- 이벤트 인지 **즉시** 웹훅 복구(웹훅은 ack-ignore 유지). 필요 시 별도.
- confirm route 자체의 재시도/타임아웃 강화(이번 크론이 백스톱이므로 불필요).
- 작품 `reconcile-payments`와의 통합(단일 책임 분리 유지).

## 10. 테스트 전략

- **순수 결정 함수 분리:** `decideEventReconcileAction({ status, tossStatus, seatAvailable })` → `'confirm' | 'refund' | 'skip' | 'alert'`. 이걸 unit test(작품 크론이 인라인이라 테스트 어려웠던 점 개선).
- **라우트 테스트:** Supabase/Toss/notify 모킹 — `pending+DONE→confirm`, `pending+DONE+sold_out→refund`, `expired+DONE→refund`, `not-DONE→skip`, `refund 실패→alert`, 인증 실패→401.
- **회귀:** `reconcile-event-registrations`가 작품 `orders`를 건드리지 않음(이벤트 테이블 전용) 확인.
