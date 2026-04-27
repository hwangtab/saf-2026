/**
 * TossPayments configuration with provider switch.
 *
 * Multiple providers coexist after the 2026-04 architecture pivot:
 * - 'domestic'    : saf202i818 신규 국내 MID, API 개별 연동 (live_ck_/live_sk_)
 *                   카드/계좌이체/카카오페이/토스페이 (네이버페이 심사 중) — 새 ko 주문 기본값
 * - 'overseas'    : saf202719y 해외 결제 MID, API 개별 연동 (live_ck_/live_sk_) — PayPal
 * - 'widget'      : 결제위젯 키 (live_gck_/live_gsk_) — 비활성화 (에스크로 이슈로 미사용,
 *                   레거시 호환만 유지)
 * - 'api_v1'      : cafe24 경유 레거시 MID (live_ck_/live_sk_) — 레거시 주문 reconcile 전용
 *
 * Each order is bound to a single provider via `orders.metadata.payment_provider`,
 * so confirm/cancel calls always use the matching MID's secret.
 */

export const TOSS_API_BASE_URL = 'https://api.tosspayments.com';

export const SHIPPING_THRESHOLD = 200_000;
export const SHIPPING_FEE = 4_000;

export type PaymentProvider = 'api_v1' | 'widget' | 'domestic' | 'overseas';

export const DEFAULT_PROVIDER: PaymentProvider = 'domestic';

export interface TossConfig {
  clientKey: string;
  secretKey: string;
  apiBaseUrl: string;
  provider: PaymentProvider;
}

export function getTossConfig(provider: PaymentProvider = DEFAULT_PROVIDER): TossConfig | null {
  if (provider === 'domestic') {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_DOMESTIC_CLIENT_KEY;
    const secretKey = process.env.TOSS_PAYMENTS_DOMESTIC_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
  }
  if (provider === 'overseas') {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_OVERSEAS_CLIENT_KEY;
    const secretKey = process.env.TOSS_PAYMENTS_OVERSEAS_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
  }
  if (provider === 'widget') {
    const clientKey = process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY;
    const secretKey = process.env.TOSS_PAYMENTS_WIDGET_SECRET_KEY;
    if (!clientKey || !secretKey) return null;
    return { clientKey, secretKey, apiBaseUrl: TOSS_API_BASE_URL, provider };
  }
  // 'api_v1' — legacy cafe24 경유
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

/** Browser-safe domestic client key (saf202i818). */
export function getTossDomesticClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_DOMESTIC_CLIENT_KEY ?? null;
}

/** Browser-safe overseas client key (saf202719y, PayPal). */
export function getTossOverseasClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_OVERSEAS_CLIENT_KEY ?? null;
}

/** @deprecated 위젯 코드 호환용 — 새 코드는 getTossDomesticClientKey/getTossOverseasClientKey 사용 */
export function getTossWidgetClientKey(): string | null {
  return process.env.NEXT_PUBLIC_TOSS_WIDGET_CLIENT_KEY ?? null;
}

/**
 * Payment mode is 'toss' if any provider is configured, else 'disabled'.
 * Used by checkout page guard to 404 when nothing is set up.
 */
export function getPaymentMode(): 'toss' | 'disabled' {
  return getTossConfig('domestic') ||
    getTossConfig('overseas') ||
    getTossConfig('widget') ||
    getTossConfig('api_v1')
    ? 'toss'
    : 'disabled';
}

export function calculateShippingFee(itemAmount: number): number {
  return itemAmount >= SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
}

/**
 * Reads the payment provider from an order's metadata JSON.
 * Defaults to 'api_v1' for legacy orders that pre-date the widget migration
 * (those orders' paymentKeys belong to the cafe24 경유 MID).
 */
export function resolveOrderProvider(metadata: unknown): PaymentProvider {
  if (!metadata || typeof metadata !== 'object') return 'api_v1';
  const value = (metadata as { payment_provider?: unknown }).payment_provider;
  if (value === 'widget' || value === 'api_v1' || value === 'domestic' || value === 'overseas') {
    return value;
  }
  return 'api_v1';
}
