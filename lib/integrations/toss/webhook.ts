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
 * Verifies the TossPayments webhook request using HTTP Basic Authentication.
 * Toss는 웹훅 요청 헤더에 Authorization: Basic {base64(webhookSecret:)}를 포함한다.
 * TOSS_PAYMENTS_WEBHOOK_SECRET 환경 변수가 설정된 경우에만 검증하며,
 * 미설정 시(개발 환경)에는 통과한다.
 */
export function verifyWebhookRequest(req: {
  headers: { get(name: string): string | null };
}): boolean {
  const secret = process.env.TOSS_PAYMENTS_WEBHOOK_SECRET;
  if (!secret) return true; // 환경 변수 미설정 시 검증 생략

  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Basic ')) return false;

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
