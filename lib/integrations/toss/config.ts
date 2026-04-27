/**
 * TossPayments configuration with provider switch.
 *
 * Two providers coexist during the v2 결제위젯 migration:
 * - 'api_v1': legacy 개별 연동 키 (cafe24 경유 MID, prefix `live_ck_`/`live_sk_`)
 * - 'widget': 결제위젯 키 (신규 국내 MID, prefix `live_gck_`/`live_gsk_`)
 *
 * Each order is bound to a single provider via `orders.metadata.payment_provider`,
 * so confirm/cancel calls always use the matching MID's secret.
 */

export const TOSS_API_BASE_URL = 'https://api.tosspayments.com';

export const SHIPPING_THRESHOLD = 200_000;
export const SHIPPING_FEE = 4_000;

export type PaymentProvider = 'api_v1' | 'widget';

export const DEFAULT_PROVIDER: PaymentProvider = 'widget';

export interface TossConfig {
  clientKey: string;
  secretKey: string;
  apiBaseUrl: string;
  provider: PaymentProvider;
}

export function getTossConfig(provider: PaymentProvider = DEFAULT_PROVIDER): TossConfig | null {
  if (provider === 'widget') {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
    const secretKey = process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
  }
  const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
  const secretKey = process.env.TOSS_PAYMENTS_SECRET_KEY;
  if (!clientKey || !secretKey) return null;
  return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
}

export function getTossAuthHeader(provider: PaymentProvider = DEFAULT_PROVIDER): string {
  const config = getTossConfig(provider);
  if (!config) throw new Error(`TossPayments (${provider}) is not configured`);
  return 'Basic ' + Buffer.from(config.secretKey + ':').toString('base64');
}

/** Browser-safe widget client key (returns null if not configured). */
export function getTossWidgetClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY ?? null;
}

/** Payment mode is always 'toss' as long as either provider is configured. */
export function getPaymentMode(): 'toss' | 'disabled' {
  return getTossConfig('widget') || getTossConfig('api_v1') ? 'toss' : 'disabled';
}

export function calculateShippingFee(itemAmount: number): number {
  return itemAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * Reads the payment provider from an order's metadata JSON.
 * Defaults to 'api_v1' for legacy orders that pre-date the widget migration.
 */
export function resolveOrderProvider(metadata: unknown): PaymentProvider {
  if (!metadata || typeof metadata !== 'object') return 'api_v1';
  const value = (metadata as { payment_provider?: unknown }).payment_provider;
  if (value === 'widget' || value === 'api_v1') return value;
  return 'api_v1';
}
