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

  const body = await response.json();

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
  return response.json();
}
