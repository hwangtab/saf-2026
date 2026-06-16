/**
 * TossPayments v2 — webhook payload verification and parsing.
 *
 * Two event types:
 * - PAYMENT_STATUS_CHANGED: general payment status update
 * - DEPOSIT_CALLBACK: virtual account deposit confirmed (uses data.secret)
 */

import crypto from 'crypto';
import type {
  TossWebhookPayload,
  TossWebhookDepositCallback,
  TossWebhookPaymentStatusChanged,
} from './types';

/**
 * Verifies the TossPayments webhook request via HTTP Basic Authentication
 * IF AND ONLY IF the legacy global webhook secret is configured.
 *
 * 토스 공식 문서(2026 기준)에는 글로벌 webhook secret이 더 이상 명시되지 않으며,
 * 결제위젯 신규 MID 등록 시 secret이 발급되지 않는다. 따라서 두 가지 시나리오를
 * 모두 지원한다:
 *
 * - **Legacy MID** (예: cafe24 경유 API 개별 연동) — `TOSS_PAYMENTS_WEBHOOK_SECRET`
 *   환경변수와 Authorization 헤더가 모두 존재. 기존대로 timing-safe 비교로 검증.
 * - **New MID** (결제위젯) — env / 헤더 둘 중 하나라도 없으면 이 검증을 건너뛰고
 *   상위 layer(per-payment body secret + Toss API double-verify)에 의존.
 *
 * 보안 모델은 토스 공식 권장과 일치:
 * 1. DEPOSIT_CALLBACK은 `verifyDepositCallbackSecret`(요청 body의 `secret` 필드를
 *    결제 시점 저장된 `virtualAccount.secret`과 비교)로 검증.
 * 2. PAYMENT_STATUS_CHANGED는 `fetchPayment(paymentKey)` 호출로 토스 API 재조회 검증.
 */
export function verifyWebhookRequest(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  const authHeader = req.headers.get('Authorization');

  // 시나리오 분기는 env 존재 여부로 명시 — "헤더 없으면 무조건 통과"라는 암묵 분기 금지.
  //
  // Case A: env가 설정되어 있다 → legacy MID. Authorization 헤더는 반드시 존재해야 하고
  //         secret과 timing-safe 일치해야 한다. 헤더가 비었으면 검증 실패로 거부.
  // Case B: env가 미설정이다 → 신규 결제위젯 MID(토스가 헤더를 보내지 않음). 상위 검증
  //         layer(DEPOSIT_CALLBACK은 body의 per-payment secret, PAYMENT_STATUS_CHANGED는
  //         Toss API 재조회)에 위임한다. 운영자가 의도적으로 env를 비워야 통과한다.
  if (!secret) {
    // 신규 MID 모드. 헤더가 잘못 붙어 있으면 무시하지 말고 경고로 흔적 남기되 통과.
    if (authHeader) {
      console.warn(
        '[TossWebhook] TOSS_PAYMENTS_WEBHOOK_SECRET 미설정 상태에서 Authorization 헤더 수신 — env 설정 여부 확인 필요'
      );
    }
    return true;
  }

  // Legacy MID 모드. 헤더 필수.
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    console.error(
      '[TossWebhook] TOSS_PAYMENTS_WEBHOOK_SECRET 설정 상태에서 Authorization 헤더 누락 — 검증 실패'
    );
    return false;
  }

  const encoded = authHeader.slice(6); // 'Basic ' 이후
  const expected = Buffer.from(`${secret}:`).toString('base64');

  try {
    const incomingBuf = Buffer.from(encoded);
    const expectedBuf = Buffer.from(expected);
    if (incomingBuf.length !== expectedBuf.length) return false;
    return crypto.timingSafeEqual(incomingBuf, expectedBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies the DEPOSIT_CALLBACK webhook secret using timing-safe comparison.
 * TossPayments의 secret은 결제 건별 고유값으로, 결제 승인 응답의
 * virtualAccount.secret에 포함된다. DB에 저장된 값과 비교해야 한다.
 */
export function verifyDepositCallbackSecret(
  payload: TossWebhookDepositCallback,
  storedSecret: string | null
): boolean {
  if (!storedSecret) return false;
  try {
    const incoming = Buffer.from(payload.data.secret);
    const stored = Buffer.from(storedSecret);
    if (incoming.length !== stored.length) return false;
    return crypto.timingSafeEqual(incoming, stored);
  } catch {
    return false;
  }
}

/** Type guard for DEPOSIT_CALLBACK */
export function isDepositCallback(
  payload: TossWebhookPayload
): payload is TossWebhookDepositCallback {
  return payload.eventType === 'DEPOSIT_CALLBACK';
}

/** Type guard for PAYMENT_STATUS_CHANGED */
export function isPaymentStatusChanged(
  payload: TossWebhookPayload
): payload is TossWebhookPaymentStatusChanged {
  return payload.eventType === 'PAYMENT_STATUS_CHANGED';
}

/**
 * 이벤트(추도식) 결제 여부 판별 — 단일 출처.
 *
 * 추도식 이벤트 결제는 작품 결제와 같은 domestic MID(saf202i818)를 공유해 동일한 웹훅
 * 엔드포인트로 들어오지만, 라이프사이클은 `event_registrations` + event confirm route가
 * 전담한다(작품 웹훅의 payments/orders/artwork_sales 경로로는 처리 불가).
 * orderId 포맷으로 구분: 작품 = 'SAF-YYYYMMDD-XXXXXXXX'(generateOrderNumber),
 * 이벤트 = 'EVT-<16 hex>'(RPC 발급). 접두가 겹치지 않아 안전.
 */
export function isEventOrderId(orderId: string): boolean {
  return orderId.startsWith('EVT-');
}

/** Safely parses a raw webhook body into a typed payload, or returns null if invalid. */
export function parseWebhookPayload(body: unknown): TossWebhookPayload | null {
  if (!body || typeof body !== 'object') return null;

  const p = body as Record<string, unknown>;
  if (
    typeof p.eventType !== 'string' ||
    !['PAYMENT_STATUS_CHANGED', 'DEPOSIT_CALLBACK'].includes(p.eventType)
  ) {
    return null;
  }

  if (!p.data || typeof p.data !== 'object') return null;

  const data = p.data as Record<string, unknown>;
  if (typeof data.orderId !== 'string') return null;

  return body as TossWebhookPayload;
}
