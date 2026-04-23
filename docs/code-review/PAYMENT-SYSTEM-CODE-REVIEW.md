# SAF 2026 결제 시스템 코드 리뷰 보고서

**작성일**: 2026-04-22  
**리뷰 범위**: TossPayments 연동 전체 (confirm, webhook, sanitize, config, types)  
**등급**: 외부 유출 금지

---

## 목차

1. [Executive 요약](#1-executive-요약)
2. [결제 확인 API (`/api/payments/toss/confirm`)](#2-결제-확인-api-apipayments toss confirm)
3. [웹훅 API (`/api/webhooks/toss`)](#3-웹훅-api-apimwebhooks toss)
4. [Sanitization (`lib/integrations/toss/sanitize.ts`)](#4-sanitization-libintegrations toss sanitizets)
5. [Config (`lib/integrations/toss/config.ts`)](#5-config-libintegrations toss confts)
6. [Types (`lib/integrations/toss/types.ts`)](#6-types-libintegrations toss typests)
7. [Internal API — 결제 정산 (`/api/internal/reconcile-payments`)](#7-internal-api--결제-정산-apiminternal reconcile-payments)
8. [종합 개선 사항 우선순위](#8종합-개선-사항-우선순위)

---

## 1. Executive 요약

SAF 2026 결제 시스템은 **매우 높은 보안 및 안정성 수준**으로 구현되어 있습니다. 금액 검증, optimistic locking, 레이스 컨디션 방어, idempotency, PII sanitization 등 핵심 결제 보안 메커니즘이 적절히 구현되어 있습니다.

다만 **1개의 중등도 취약점**이 확인되었습니다:

| 심각도   | 항목                                                 | 파일                                           | 영향                         |
| -------- | ---------------------------------------------------- | ---------------------------------------------- | ---------------------------- |
| **HIGH** | `reconcile-payments`에서 `confirm_response` raw 저장 | `app/api/internal/reconcile-payments/route.ts` | 카드 번호 등 PII 노출 가능성 |

---

## 2. 결제 확인 API (`/api/payments/toss/confirm`)

### 파일: `app/api/payments/toss/confirm/route.ts`

**평가**: 매우 잘 구현됨.

### 2.1 구현된 보안 메커니즘

| 메커니즘              | 구현 상태 | 비고                                                |
| --------------------- | --------- | --------------------------------------------------- |
| 금액 검증 (SEC-01)    | ✅        | `order.total_amount === amount` 정확 일치 검증      |
| Optimistic locking    | ✅        | `version` column으로 동시 업데이트 방지             |
| 레이스 컨디션 처리    | ✅        | `check_artwork_availability` RPC로 작품 가용성 확인 |
| Idempotency key       | ✅        | `Idempotency-Key` 헤더로 중복 결제 방지             |
| PII sanitization      | ✅        | `sanitizeConfirmResponse()` 호출                    |
| Payment record INSERT | ✅        | 결제 기록 DB 저장                                   |

### 2.2 구현 세부 사항

**금액 검증 (SEC-01)**:

```typescript
// 현재 코드 (적절)
if (order.total_amount !== amount) {
  return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
}
```

**Optimistic Locking**:

```typescript
// 현재 코드 (적절)
await supabase
  .from('payments')
  .update({ status: 'paid' })
  .eq('id', paymentId)
  .eq('version', currentVersion); // 동시 업데이트 방지
```

**레이스 컨디션 처리**:

```typescript
// 현재 코드 (적절)
const { data: isAvailable } = await supabase.rpc('check_artwork_availability', {
  artwork_id: artworkId,
});
if (!isAvailable) {
  return NextResponse.json({ error: 'Artwork no longer available' }, { status: 409 });
}
```

**Idempotency Key**:

```typescript
// 현재 코드 (적절)
const idempotencyKey = request.headers.get('Idempotency-Key');
if (idempotencyKey) {
  // 기존 결제 확인 후 재반환
}
```

### 2.3 우려 사항

| 항목                            | 심각도 | 비고                                                          |
| ------------------------------- | ------ | ------------------------------------------------------------- |
| Payment INSERT 실패 시 500 반환 | MEDIUM | 결제 기록 누락 — reconciliation cron으로 보정 예정이라고 명시 |
| Toss API 응답 에러 처리         | LOW    | Toss API 호출 실패 시 사용자 피드백 개선 필요                 |

---

## 3. 웹훅 API (`/api/webhooks/toss`)

### 파일: `app/api/webhooks/toss/route.ts`

**평가**: 매우 잘 구현됨.

### 3.1 구현된 보안 메커니즘

| 메커니즘                         | 구현 상태 | 비고                                      |
| -------------------------------- | --------- | ----------------------------------------- |
| HMAC-SHA1 signature verification | ✅        | `crypto.timingSafeEqual` 사용             |
| Per-payment secret 검증          | ✅        | DEPOSIT_CALLBACK별 per-payment secret     |
| Toss API double-verify           | ✅        | Toss API 호출로 웹훅 진위 확인            |
| Idempotency guards               | ✅        | 이미 처리된 웹훅 중복 처리 방지           |
| 이벤트 타입 처리                 | ✅        | PAYMENT_STATUS_CHANGED + DEPOSIT_CALLBACK |

### 3.2 구현 세부 사항

**HMAC-SHA1 Signature Verification**:

```typescript
// 현재 코드 (적절)
const signature = request.headers.get('x-toss-signature');
const isValid = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature));
if (!isValid) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
```

**Per-Payment Secret Verification (DEPOSIT_CALLBACK)**:

```typescript
// 현재 코드 (적절)
if (event.type === 'DEPOSIT_CALLBACK') {
  const payment = await getPaymentByVirtualAccount(data.paymentKey);
  const isValid = crypto.timingSafeEqual(
    Buffer.from(data.signature),
    Buffer.from(payment.webhook_secret)
  );
}
```

**Toss API Double-Verify**:

```typescript
// 현재 코드 (적절)
const tossPayment = await tossPayments.payment.retrieve({ paymentKey });
// Toss API 응답으로 웹훅 진위 확인
```

### 3.3 가상계좌 처리

| 단계                         | 구현 상태 | 비고                             |
| ---------------------------- | --------- | -------------------------------- |
| 가상계좌 생성                | ✅        | Toss API 호출                    |
| 입금 대기                    | ✅        | `status: 'awaiting_deposit'`     |
| 입금 확인 (DEPOSIT_CALLBACK) | ✅        | `check_artwork_availability` RPC |
| artwork_sales INSERT         | ✅        | 판매 기록 DB 저장                |
| artwork 상태 업데이트        | ✅        | reserved → sold 동기화           |

---

## 4. Sanitization (`lib/integrations/toss/sanitize.ts`)

### 파일: `lib/integrations/toss/sanitize.ts`

**평가**: 잘 구현됨.

### 4.1 제거되는 PII 필드

| 필드                              | 설명            | 제거 상태 |
| --------------------------------- | --------------- | --------- |
| `card.number`                     | 카드 번호       | ✅ 제거   |
| `card.approveNo`                  | 승인 번호       | ✅ 제거   |
| `mobilePhone.customerMobilePhone` | 모바일 전화번호 | ✅ 제거   |

### 4.2 우려 사항

| 항목                                                        | 심각도   | 비고                                                                    |
| ----------------------------------------------------------- | -------- | ----------------------------------------------------------------------- |
| `reconcile-payments`에서 `sanitizeConfirmResponse()` 미사용 | **HIGH** | `app/api/internal/reconcile-payments/route.ts`에서 raw Toss 데이터 저장 |

---

## 5. Config (`lib/integrations/toss/config.ts`)

### 파일: `lib/integrations/toss/config.ts`

**평가**: 적절히 구현됨.

| 항목                         | 구현 상태 | 비고                           |
| ---------------------------- | --------- | ------------------------------ |
| 환경 변수에서 시크릿 키 로드 | ✅        | `TOSS_PAYMENTS_SECRET_KEY`     |
| 환경별 설정 (test/live)      | ✅        | `TOSS_PAYMENTS_MODE`           |
| API endpoint URL             | ✅        | `https://api.tosspayments.com` |

---

## 6. Types (`lib/integrations/toss/types.ts`)

### 파일: `lib/integrations/toss/types.ts`

**평가**: 잘 구현됨.

| 타입               | 구현 상태 | 비고                  |
| ------------------ | --------- | --------------------- |
| `TossPayment`      | ✅        | Toss 결제 응답 타입   |
| `TossWebhookEvent` | ✅        | Toss 웹훅 이벤트 타입 |
| `PaymentRecord`    | ✅        | DB 결제 기록 타입     |
| `ConfirmResponse`  | ✅        | 결제 확인 응답 타입   |

---

## 7. Internal API — 결제 정산 (`/api/internal/reconcile-payments`)

### 파일: `app/api/internal/reconcile-payments/route.ts`

**평가**: **중등도 취약점** 확인.

### 7.1 문제: `confirm_response` raw 저장

```typescript
// 현재 코드 (문제)
await supabase.from('payments').insert({
  payment_key: tossPayment.paymentKey,
  amount: tossPayment.amount,
  method: tossPayment.method,
  confirm_response: tossPayment as Record<string, unknown>, // PII 노출!
});
```

**영향**: `tossPayment`에는 카드 번호, 승인 번호, 모바일 전화번호 등 PII가 포함될 수 있습니다. `/api/payments/toss/confirm/route.ts`는 `sanitizeConfirmResponse()`를 호출하지만, 이 라우트는 호출하지 않습니다.

### 7.2 해결 방안

```typescript
// 해결 코드
import { sanitizeConfirmResponse } from '@/lib/integrations/toss/sanitize';

await supabase.from('payments').insert({
  payment_key: tossPayment.paymentKey,
  amount: tossPayment.amount,
  method: tossPayment.method,
  confirm_response: sanitizeConfirmResponse(tossPayment), // PII 제거!
});
```

---

## 8. 종합 개선 사항 우선순위

### 즉시 조치 (Immediate)

| #   | 항목                                                      | 파일                                           | 예상 효과     |
| --- | --------------------------------------------------------- | ---------------------------------------------- | ------------- |
| 1   | `reconcile-payments`에서 `sanitizeConfirmResponse()` 호출 | `app/api/internal/reconcile-payments/route.ts` | PII 노출 방지 |

### 높은 우선순위 (High)

| #                                                                          | 항목                                     | 파일                | 예상 효과 |
| -------------------------------------------------------------------------- | ---------------------------------------- | ------------------- | --------- |
| 2. Payment INSERT 실패 시 500 대신 503 반환 + reconciliation cron으로 보정 | `app/api/payments/toss/confirm/route.ts` | 결제 기록 누락 방지 |
| 3. Toss API 응답 에러 처리 개선 — 사용자 피드백 명확화                     | `app/api/payments/toss/confirm/route.ts` | UX 향상             |

### 중간 우선순위 (Medium)

| #                                           | 항목                                     | 파일             | 예상 효과 |
| ------------------------------------------- | ---------------------------------------- | ---------------- | --------- |
| 4. 가상계좌 생성 실패 시 사용자 피드백 개선 | `app/api/payments/toss/confirm/route.ts` | UX 향상          |
| 5. 웹훅 처리 실패 시 재시도 로직 추가       | `app/api/webhooks/toss/route.ts`         | 웹훅 신뢰성 향상 |

### 낮은 우선순위 (Low)

| #                                      | 항목 | 파일             | 예상 효과 |
| -------------------------------------- | ---- | ---------------- | --------- |
| 6. 결제 로그审计 — 모든 결제 시도 로깅 | 전체 | 감사 추적        |
| 7. 결제 실패율 모니터링 대시보드       | 전체 | 데이터 기반 개선 |

---

## 부록: 파일 인벤토리

### 결제 확인 API

| 파일                                     | 역할                                                                                    | 평가          |
| ---------------------------------------- | --------------------------------------------------------------------------------------- | ------------- |
| `app/api/payments/toss/confirm/route.ts` | 결제 확인 (금액 검증, optimistic locking, 레이스 컨디션, idempotency, PII sanitization) | **매우 우수** |

### 웹훅 API

| 파일                             | 역할                                                                           | 평가          |
| -------------------------------- | ------------------------------------------------------------------------------ | ------------- |
| `app/api/webhooks/toss/route.ts` | Toss 웹훅 (HMAC-SHA1, per-payment secret, Toss API double-verify, idempotency) | **매우 우수** |

### Sanitization

| 파일                                | 역할                                                     | 평가     |
| ----------------------------------- | -------------------------------------------------------- | -------- |
| `lib/integrations/toss/sanitize.ts` | PII 필드 제거 (card.number, card.approveNo, mobilePhone) | **우수** |

### Config

| 파일                              | 역할                | 평가     |
| --------------------------------- | ------------------- | -------- |
| `lib/integrations/toss/config.ts` | 환경 변수 기반 설정 | **적절** |

### Types

| 파일                             | 역할                   | 평가     |
| -------------------------------- | ---------------------- | -------- |
| `lib/integrations/toss/types.ts` | Toss 결제/웹훅/DB 타입 | **우수** |

### Internal API — 결제 정산

| 파일                                           | 역할             | 평가                                          |
| ---------------------------------------------- | ---------------- | --------------------------------------------- |
| `app/api/internal/reconcile-payments/route.ts` | 결제 정산 (cron) | **HIGH** — `sanitizeConfirmResponse()` 미사용 |

---

**리뷰 완료일**: 2026-04-22  
**다음 리뷰 권장**: 2026-07-22 (3개월 후, 결제 실패율/유형 분석)
