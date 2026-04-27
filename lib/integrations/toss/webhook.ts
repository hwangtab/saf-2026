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
  const authHeader = req.headers.get('Authorization');

  // 헤더 부재 — 신규 결제위젯 MID처럼 토스가 Authorization 헤더를 보내지 않는 케이스.
  // 상위 검증 layer(DEPOSIT_CALLBACK은 body의 per-payment secret, PAYMENT_STATUS_CHANGED는
  // Toss API 재조회)에 의존하므로 헤더 없이도 통과시킨다.
  if (!authHeader || !authHeader.startsWith('Basic ')) {
    return true;
  }

  // 헤더가 존재하면 반드시 env에 설정된 secret과 일치해야 한다 (legacy cafe24 경유 MID).
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) {
    console.error(
      '[TossWebhook] Authorization 헤더는 있는데 TOSS_PAYMENTS_WEBHOOK_SECRET이 미설정 — 검증 실패'
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
