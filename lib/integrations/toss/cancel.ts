/**
 * TossPayments v2 — server-side payment cancellation / refund.
 * Called from admin-orders server action when processing a refund.
 */

import { getTossAuthHeader, getTossConfig } from './config';
import { fetchWithTimeout } from './fetch-with-timeout';
import type {
  TossCancelRequest,
  CancelResult,
  TossErrorResponse,
  TossCancelResponse,
} from './types';

/**
 * Calls POST /v1/payments/{paymentKey}/cancel with Basic Auth.
 * @param paymentKey - payment key from TossPayments
 * @param request - cancelReason required; refundReceiveAccount required for virtual account payments
 * @param idempotencyKey - optional Idempotency-Key header to prevent duplicate cancels
 */
export async function cancelPayment(
  paymentKey: string,
  request: TossCancelRequest,
  idempotencyKey?: string
): Promise<CancelResult> {
  const config = getTossConfig();
  if (!config) throw new Error('TossPayments is not configured');

  const headers: Record<string, string> = {
    Authorization: getTossAuthHeader(),
    'Content-Type': 'application/json',
  };

  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }

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

  if (!response.ok) {
    return { success: false, error: body as TossErrorResponse };
  }

  return { success: true, data: body as TossCancelResponse };
}
