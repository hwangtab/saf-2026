/**
 * TossPayments v2 — server-side payment cancellation / refund.
 * Called from admin-orders server action when processing a refund.
 */

import { getTossAuthHeader, getTossConfig } from './config';
import type { TossCancelRequest, CancelResult } from './types';

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

  const response = await fetch(`${config.apiBaseUrl}/v1/payments/${paymentKey}/cancel`, {
    method: 'POST',
    headers,
    body: JSON.stringify(request),
  });

  const body = await response.json();

  if (!response.ok) {
    return { success: false, error: body };
  }

  return { success: true, data: body };
}
