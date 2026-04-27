/**
 * TossPayments — server-side payment cancellation / refund.
 * Provider must match the order's payment_provider metadata.
 */

import { getTossAuthHeader, getTossConfig, type PaymentProvider, DEFAULT_PROVIDER } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type {
  TossCancelRequest,
  CancelResult,
  TossErrorResponse,
  TossCancelResponse,
} from './types';

export async function cancelPayment(
  paymentKey: string,
  request: TossCancelRequest,
  idempotencyKey?: string,
  provider: PaymentProvider = DEFAULT_PROVIDER
): Promise<CancelResult> {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(provider),
    'Content-Type': 'application/json',
  };
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments/${paymentKey}/cancel`, {
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
        },
      };
    }
    throw new Error(`Toss 응답 파싱 실패: ${text.slice(0, 200)}`);
  }

  if (!response.ok) return { success: false, error: body as TossErrorResponse };
  return { success: true, data: body as TossCancelResponse };
}
