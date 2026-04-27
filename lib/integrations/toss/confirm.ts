/**
 * TossPayments — server-side payment confirmation + lookup helpers.
 * Caller MUST pass the provider that originated the payment so the right MID
 * secret is used.
 */

import { getTossAuthHeader, getTossConfig, type PaymentProvider, DEFAULT_PROVIDER } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type { TossConfirmRequest, TossConfirmResponse, TossErrorResponse } from './types';

export type ConfirmResult =
  | { success: true; data: TossConfirmResponse }
  | { success: false; error: TossErrorResponse };

export async function confirmPayment(
  request: TossConfirmRequest,
  idempotencyKey?: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<ConfirmResult> {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(provider),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

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

  if (!response.ok) return { success: false, error: body as TossErrorResponse };
  return { success: true, data: body as TossConfirmResponse };
}

export async function fetchPayment(
  paymentKey: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<TossConfirmResponse | null> {
  const config = getTossConfig(provider);
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/${paymentKey}`, {
    headers: { Authorization: getTossAuthHeader(provider) },
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

export async function fetchPaymentByOrderId(
  orderId: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<TossConfirmResponse | null> {
  const config = getTossConfig(provider);
  if (!config) return null;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/orders/${orderId}`, {
    headers: { Authorization: getTossAuthHeader(provider) },
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
