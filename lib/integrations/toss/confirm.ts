/**
 * TossPayments v2 — server-side payment confirmation.
 * Called from /api/payments/toss/confirm/route.ts after amount verification.
 */

import { getTossAuthHeader, getTossConfig } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { TossConfirmRequest, TossConfirmResponse, TossErrorResponse } from './types';

export type ConfirmResult =
  | { success: true; data: TossConfirmResponse }
  | { success: false; error: TossErrorResponse };

/**
 * Calls POST /v1/payments/confirm with Basic Auth.
 * @param request - paymentKey, orderId, amount (must match orders.total_amount)
 * @param idempotencyKey - optional Idempotency-Key header to prevent duplicate confirms
 */
export async function confirmPayment(
  request: TossConfirmRequest,
  idempotencyKey?: string
): Promise<ConfirmResult> {
  const config = getTossConfig();
  if (!config) throw new Error('TossPayments is not configured');

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(),
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/confirm`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    if (!response.ok) {
      return {
        success: false,
        error: {
          code: 'PARSE_ERROR',
          message: `Toss 응답 파싱 실패 (${response.status}): ${text.slice(0, 200)}`,
        } as TossErrorResponse,
      };
    }
    throw new Error(`Toss 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  if (!response.ok) {
    return { success: false, error: body as TossErrorResponse };
  }

  return { success: true, data: body as TossConfirmResponse };
}

/**
 * Fetches a payment by paymentKey from TossPayments API.
 * Used for double-verification (SEC-04) in webhook handler.
 */
export async function fetchPayment(paymentKey: string): Promise<TossConfirmResponse | null> {
  const config = getTossConfig();
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/${paymentKey}`, {
    headers: { Authorization: getTossAuthHeader() },
  });

  if (!response.ok) return null;
  const text = await response.text();
  try {
    return JSON.parse(text) as TossConfirmResponse;
  } catch {
    console.error(`[toss] fetchPayment JSON parse failed: ${text.slice(0, 200)}`);
    return null;
  }
}

/**
 * Fetches a payment by orderId (our order_no) from TossPayments API.
 * Used by reconciliation cron when payment_key is unknown.
 */
export async function fetchPaymentByOrderId(orderId: string): Promise<TossConfirmResponse | null> {
  const config = getTossConfig();
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/orders/${orderId}`, {
    headers: { Authorization: getTossAuthHeader() },
  });

  if (!response.ok) return null;
  const text = await response.text();
  try {
    return JSON.parse(text) as TossConfirmResponse;
  } catch {
    console.error(`[toss] fetchPaymentByOrderId JSON parse failed: ${text.slice(0, 200)}`);
    return null;
  }
}
