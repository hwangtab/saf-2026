/**
 * TossPayments v2 — webhook payload verification and parsing.
 *
 * Two event types:
 * - PAYMENT_STATUS_CHANGED: general payment status update
 * - DEPOSIT_CALLBACK: virtual account deposit confirmed (uses data.secret)
 */

import { getTossConfig } from './config';
import type {
  TossWebhookPayload,
  TossWebhookDepositCallback,
  TossWebhookPaymentStatusChanged,
} from './types';

/**
 * Verifies the DEPOSIT_CALLBACK webhook secret.
 * TossPayments sends data.secret which must match TOSS_PAYMENTS_WEBHOOK_SECRET.
 */
export function verifyDepositCallbackSecret(payload: TossWebhookDepositCallback): boolean {
  const config = getTossConfig();
  if (!config?.webhookSecret) return false;
  return payload.data.secret === config.webhookSecret;
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
