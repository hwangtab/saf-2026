/**
 * TossPayments v2 configuration — 결제위젯 연동 키 (gck/gsk prefix)
 * Returns null when env vars are missing (safe no-op for unconfigured envs).
 */

export const TOSS_API_BASE_URL = 'https://api.tosspayments.com';

export const SHIPPING_THRESHOLD = 200_000; // KRW — free shipping above this
export const SHIPPING_FEE = 4_000; // KRW

export function getTossConfig() {
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;

  if (!clientKey || !secretKey) return null;

  return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL };
}

/** Basic Auth header for TossPayments server-side API calls. */
export function getTossAuthHeader(): string {
  const config = getTossConfig();
  if (!config) throw new Error('TossPayments secret key is not configured');
  return 'Basic ' + Buffer.from(config.secretKey + ':').toString('base64');
}

/** Reads NEXT_PUBLIC_PAYMENT_MODE — defaults to 'cafe24' when unset. */
export function getPaymentMode(): 'toss' | 'cafe24' {
  return process.env.NEXT_PUBLIC_PAYMENT_MODE === 'toss' ? 'toss' : 'cafe24';
}

/**
 * Calculates shipping fee.
 * Free for orders ≥ ₩200,000; otherwise ₩4,000.
 */
export function calculateShippingFee(itemAmount: number): number {
  return itemAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}
