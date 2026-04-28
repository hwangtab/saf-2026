'use server';

import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { parsePrice } from '@/lib/parsePrice';
import {
  calculateShippingFee,
  getTossAuthHeader,
  getTossConfig,
  type PaymentProvider,
} from '@/lib/integrations/toss/config';
import { fetchWithTimeout } from '@/lib/integrations/toss/fetch-with-timeout';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
import type { TossErrorResponse } from '@/lib/integrations/toss/types';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL, SITE_URL_ALIAS } from '@/lib/constants';
import { apiError, type ApiLocale } from '@/lib/api-locale';
import { krwToUsd } from '@/lib/utils/currency';

export type CreateOrderInput = {
  artworkId: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingPostalCode: string;
  shippingMemo?: string;
  locale?: 'ko' | 'en';
};

export type CreateOrderResult =
  | { success: true; orderId: string; orderNo: string; totalAmount: number; orderName: string }
  | { success: false; error: string };

const MAX_ORDER_NO_INSERT_RETRIES = 3;

function isOrderNoUniqueViolation(error: unknown) {
  const typed = error as { code?: string; message?: string } | null;
  if (!typed) return false;
  return (
    typed.code === '23505' ||
    typed.message?.includes('orders_order_no_key') ||
    typed.message?.includes('duplicate key value') ||
    false
  );
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const {
    artworkId,
    buyerName,
    buyerEmail,
    buyerPhone,
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingAddressDetail,
    shippingPostalCode,
    shippingMemo,
    locale,
  } = input;
  const buyerLocale: ApiLocale = locale === 'en' ? 'en' : 'ko';
  const buyerEmailNorm = buyerEmail.trim().toLowerCase();

  // Rate limiting — IP 기준 분당 10회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimit(`createOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: apiError('rate_limited', buyerLocale) };
  }

  // Basic validation
  if (!artworkId || !buyerName || !buyerEmail || !buyerPhone) {
    return { success: false, error: apiError('required_buyer_info', buyerLocale) };
  }
  if (!shippingAddress || !shippingPostalCode || !shippingAddressDetail) {
    return { success: false, error: apiError('required_shipping_info', buyerLocale) };
  }

  // 입력 길이 상한 — 거대 페이로드로 DB INSERT/이메일 렌더 비용 폭주 방지
  if (
    buyerName.length > 50 ||
    buyerEmail.length > 254 ||
    buyerPhone.length > 20 ||
    shippingName.length > 50 ||
    shippingPhone.length > 20 ||
    shippingAddress.length > 200 ||
    (shippingAddressDetail?.length ?? 0) > 200 ||
    shippingPostalCode.length > 10 ||
    (shippingMemo?.length ?? 0) > 500
  ) {
    return { success: false, error: apiError('invalid_input_length', buyerLocale) };
  }

  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(buyerEmailNorm)) {
    return { success: false, error: apiError('invalid_email_format', buyerLocale) };
  }
  // 전화번호: ITU E.164 — 국가코드 포함 7-15 digits 허용 (한국 9-11도 포함)
  const phoneDigits = buyerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { success: false, error: apiError('invalid_phone_format', buyerLocale) };
  }
  const shippingPhoneDigits = shippingPhone.replace(/\D/g, '');
  if (shippingPhone && (shippingPhoneDigits.length < 7 || shippingPhoneDigits.length > 15)) {
    return { success: false, error: apiError('invalid_shipping_phone_format', buyerLocale) };
  }
  // 우편번호: ko는 5자리 숫자, en은 알파+숫자+공백+하이픈 3-10자
  // (예: US 12345 / 12345-6789, UK SW1A 1AA, Canada K1A 0B1, Japan 123-4567)
  const trimmedPostal = shippingPostalCode.trim();
  const postalValid =
    buyerLocale === 'ko'
      ? /^\d{5}$/.test(trimmedPostal)
      : /^[A-Za-z0-9 -]{3,10}$/.test(trimmedPostal);
  if (!postalValid) {
    return { success: false, error: apiError('invalid_postal_code', buyerLocale) };
  }

  const adminClient = createSupabaseAdminClient();

  // Fetch artwork (parse price server-side — never trust client)
  const { data: artwork, error: artworkError } = await adminClient
    .from('artworks')
    .select('id, title, price, status, artists(name_ko)')
    .eq('id', artworkId)
    .eq('is_hidden', false)
    .single();

  if (artworkError || !artwork) {
    return { success: false, error: apiError('artwork_not_found', buyerLocale) };
  }

  // 동일 구매자의 같은 작품에 대한 기존 pending_payment 주문 자동 정리
  // (탭 닫기, 뒤로가기 등으로 catch 블록이 실행되지 못한 경우 대비)
  // buyer_email 필터로 다른 구매자의 진행 중인 주문은 취소하지 않음
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('artwork_id', artworkId)
    .eq('buyer_email', buyerEmailNorm)
    .eq('status', 'pending_payment');

  // Check availability via RPC
  const { data: availResult, error: availError } = await adminClient.rpc(
    'check_artwork_availability',
    { p_artwork_id: artworkId }
  );

  if (availError) {
    return { success: false, error: apiError('availability_check_failed', buyerLocale) };
  }

  const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
  if (!isAvailable) {
    return { success: false, error: apiError('artwork_sold_out', buyerLocale) };
  }

  // Parse price server-side
  const itemAmount = parsePrice(artwork.price);
  if (!Number.isFinite(itemAmount) || itemAmount <= 0) {
    return { success: false, error: apiError('artwork_price_invalid', buyerLocale) };
  }

  const shippingAmount = calculateShippingFee(itemAmount);
  const totalAmount = itemAmount + shippingAmount;

  const artistRow = artwork.artists as { name_ko: string } | { name_ko: string }[] | null;
  const artistName = Array.isArray(artistRow)
    ? (artistRow[0]?.name_ko ?? 'Unknown Artist')
    : (artistRow?.name_ko ?? 'Unknown Artist');
  const orderName = `${artwork.title} (${artistName})`;

  // Optionally resolve logged-in user
  let buyerUserId: string | null = null;
  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    buyerUserId = user?.id ?? null;
  } catch {
    // Non-auth environment — guest checkout
    buyerUserId = null;
  }

  // Insert order (order_no UNIQUE 충돌 시 최대 3회 재시도)
  let order: {
    id: string;
  } | null = null;
  let orderNo = '';

  for (let attempt = 1; attempt <= MAX_ORDER_NO_INSERT_RETRIES; attempt++) {
    orderNo = generateOrderNumber();

    const { data: insertedOrder, error: insertError } = await adminClient
      .from('orders')
      .insert({
        order_no: orderNo,
        artwork_id: artworkId,
        quantity: 1,
        buyer_name: buyerName,
        buyer_email: buyerEmailNorm,
        buyer_phone: buyerPhone,
        buyer_user_id: buyerUserId,
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress,
        shipping_address_detail: shippingAddressDetail ?? null,
        shipping_postal_code: shippingPostalCode,
        shipping_memo: shippingMemo ?? null,
        item_amount: itemAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        status: 'pending_payment',
        metadata: {
          locale: buyerLocale,
          payment_provider: buyerLocale === 'en' ? 'overseas' : 'domestic',
          // 영문 주문은 PayPal(USD) 결제이므로 환산 USD 금액을 시점 고정해서 저장.
          // confirm 시점에 Toss가 USD로 amount를 반환하면 이 값으로 검증.
          ...(buyerLocale === 'en' ? { usd_amount: krwToUsd(totalAmount) } : {}),
        },
      })
      .select('id')
      .single();

    if (!insertError && insertedOrder) {
      order = insertedOrder;
      break;
    }

    if (!isOrderNoUniqueViolation(insertError)) {
      return { success: false, error: apiError('order_creation_failed', buyerLocale) };
    }

    console.error(`[checkout] ORDER_NO_COLLISION_RETRY attempt=${attempt}`);
  }

  if (!order) {
    return { success: false, error: apiError('order_creation_failed', buyerLocale) };
  }

  return {
    success: true,
    orderId: order.id,
    orderNo,
    totalAmount,
    orderName,
  };
}

export type InitiatePaymentInput = {
  /**
   * Toss 결제 method:
   * - 'CARD' / 'TRANSFER' / 'VIRTUAL_ACCOUNT' / 'MOBILE_PHONE' (국내)
   * - 'FOREIGN_EASY_PAY' (해외 PayPal)
   */
  method: string;
  /**
   * 간편결제 직접 라우팅. method='CARD'와 함께 사용하면 사용자가 결제수단 선택 단계
   * 없이 바로 해당 간편결제 앱/웹으로 이동.
   * 예: 'KAKAOPAY' / 'TOSSPAY' / 'NAVERPAY' / 'PAYCO' / 'SAMSUNGPAY' / 'APPLEPAY'
   */
  easyPay?: string;
  orderNo: string;
  orderName: string;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  successUrl: string;
  failUrl: string;
  /** locale 기준으로 provider 결정 (ko → domestic, en → overseas) */
  locale?: 'ko' | 'en';
};

export type InitiatePaymentResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

/**
 * POST /v1/payments — Toss-hosted 결제창 URL 발급.
 *
 * locale에 따라 provider 자동 선택:
 * - ko → 'domestic' (saf202i818)
 * - en → 'overseas' (saf202719y, PayPal)
 *
 * 위 두 MID는 모두 API 개별 연동 키 사용 (live_ck_/live_sk_).
 */
export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  const buyerLocale: ApiLocale = input.locale === 'en' ? 'en' : 'ko';
  const provider: PaymentProvider = buyerLocale === 'en' ? 'overseas' : 'domestic';

  // Rate limiting
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimit(`initiatePayment:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: apiError('rate_limited', buyerLocale) };
  }

  // redirect URL origin 검증 — 외부 URL 주입 방지
  const allowedOrigins = [new URL(SITE_URL).origin, new URL(SITE_URL_ALIAS).origin];
  const isValidUrl = (url: string) => {
    try {
      return allowedOrigins.includes(new URL(url).origin);
    } catch {
      return false;
    }
  };
  if (!isValidUrl(input.successUrl) || !isValidUrl(input.failUrl)) {
    return { success: false, error: apiError('invalid_redirect_url', buyerLocale) };
  }

  // DB 주문 검증 — 클라이언트 전달 금액·상태를 신뢰하지 않고 DB에서 재조회
  const adminClient = createSupabaseAdminClient();
  const { data: dbOrder } = await adminClient
    .from('orders')
    .select('total_amount, status')
    .eq('order_no', input.orderNo)
    .maybeSingle();

  if (!dbOrder) {
    return { success: false, error: apiError('order_not_found', buyerLocale) };
  }
  if (dbOrder.status !== 'pending_payment') {
    return { success: false, error: apiError('invalid_order_status', buyerLocale) };
  }
  if (dbOrder.total_amount !== input.totalAmount) {
    return { success: false, error: apiError('amount_mismatch', buyerLocale) };
  }

  const config = getTossConfig(provider);
  if (!config) {
    return { success: false, error: apiError('payment_session_failed', buyerLocale) };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: getTossAuthHeader(provider),
        'Content-Type': 'application/json',
        'Idempotency-Key': input.orderNo,
      },
      body: JSON.stringify(
        provider === 'overseas'
          ? {
              // PayPal 결제 (saf202719y MID): USD 환산 + FOREIGN_EASY_PAY + provider=PAYPAL
              method: 'FOREIGN_EASY_PAY',
              provider: 'PAYPAL',
              currency: 'USD',
              amount: krwToUsd(input.totalAmount),
              orderId: input.orderNo,
              orderName: input.orderName,
              successUrl: input.successUrl,
              failUrl: input.failUrl,
              customerName: input.buyerName,
              customerEmail: input.buyerEmail,
            }
          : {
              // 국내 결제 (saf202i818 MID): KRW + 카드/계좌이체/간편결제
              method: input.method,
              amount: input.totalAmount,
              orderId: input.orderNo,
              orderName: input.orderName,
              successUrl: input.successUrl,
              failUrl: input.failUrl,
              customerName: input.buyerName,
              customerEmail: input.buyerEmail,
              useEscrow: false,
              ...(input.easyPay ? { easyPay: input.easyPay } : {}),
            }
      ),
    });
  } catch {
    return { success: false, error: apiError('payment_server_unreachable', buyerLocale) };
  }

  if (!response.ok) {
    let err: TossErrorResponse = {
      code: 'UNKNOWN',
      message: apiError('payment_session_failed', buyerLocale),
    };
    try {
      err = await response.json();
    } catch {}
    console.error(
      `[initiatePayment] Toss API error (provider=${provider}):`,
      response.status,
      JSON.stringify(err)
    );
    return {
      success: false,
      error: err.message || apiError('payment_session_failed', buyerLocale),
    };
  }

  const data = await response.json();
  const checkoutUrl = (data as { checkout?: { url?: string } })?.checkout?.url;
  if (!checkoutUrl) {
    return { success: false, error: apiError('checkout_url_missing', buyerLocale) };
  }

  return { success: true, checkoutUrl };
}

/**
 * Cancels a pending_payment order when the user abandons the payment widget.
 * Only cancels orders in 'pending_payment' status — safe to call speculatively.
 */
export async function cancelPendingOrder(orderNo: string, buyerEmail: string): Promise<void> {
  if (!orderNo || !buyerEmail) return;
  // BUG 29: rate limit — IP 기준 분당 10회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = await rateLimit(`cancelPendingOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_no', orderNo)
    .eq('status', 'pending_payment')
    .eq('buyer_email', buyerEmail.trim().toLowerCase());
}
