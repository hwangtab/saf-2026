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
