'use server';

import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { parsePrice } from '@/lib/parsePrice';
import {
  calculateShippingFee,
  getTossAuthHeader,
  TOSS_API_BASE_URL,
} from '@/lib/integrations/toss/config';
import { fetchWithTimeout } from '@/lib/integrations/toss/fetch-with-timeout';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
import type { TossErrorResponse } from '@/lib/integrations/toss/types';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL, SITE_URL_ALIAS } from '@/lib/constants';
import { apiError, type ApiLocale } from '@/lib/api-locale';

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
  const rl = rateLimit(`createOrder:${ip}`, { limit: 10, windowMs: 60_000 });
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

  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(buyerEmailNorm)) {
    return { success: false, error: apiError('invalid_email_format', buyerLocale) };
  }
  const phoneDigits = buyerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 9 || phoneDigits.length > 11) {
    return { success: false, error: apiError('invalid_phone_format', buyerLocale) };
  }
  const shippingPhoneDigits = shippingPhone.replace(/\D/g, '');
  if (shippingPhone && (shippingPhoneDigits.length < 9 || shippingPhoneDigits.length > 11)) {
    return { success: false, error: apiError('invalid_shipping_phone_format', buyerLocale) };
  }
  if (!/^\d{5}$/.test(shippingPostalCode.trim())) {
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

  const orderNo = generateOrderNumber();
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

  // Insert order
  const { data: order, error: insertError } = await adminClient
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
      metadata: { locale: buyerLocale },
    })
    .select('id')
    .single();

  if (insertError || !order) {
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
  method: string;
  orderNo: string;
  orderName: string;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  successUrl: string;
  failUrl: string;
  locale?: 'ko' | 'en';
};

export type InitiatePaymentResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

/**
 * Creates a TossPayments payment session server-side (POST /v1/payments) using
 * the API 개별 연동 sk key (CF_koreasmae86 MID). Returns a checkout.url to
 * redirect the user to the Toss-hosted payment page.
 */
export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  const buyerLocale: ApiLocale = input.locale === 'en' ? 'en' : 'ko';

  // Rate limiting — IP 기준 분당 10회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`initiatePayment:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: apiError('rate_limited', buyerLocale) };
  }

  // BUG 22: redirect URL origin 검증 — 외부 URL 주입 방지
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

  // DB 주문 검증 — 클라이언트 전달 금액을 신뢰하지 않고 DB에서 재조회
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

  let response: Response;
  try {
    response = await fetchWithTimeout(`${TOSS_API_BASE_URL}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: getTossAuthHeader(),
        'Content-Type': 'application/json',
        'Idempotency-Key': input.orderNo,
      },
      body: JSON.stringify({
        method: input.method,
        amount: input.totalAmount,
        orderId: input.orderNo,
        orderName: input.orderName,
        successUrl: input.successUrl,
        failUrl: input.failUrl,
        customerName: input.buyerName,
        customerEmail: input.buyerEmail,
      }),
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
    console.error('[initiatePayment] Toss API error:', response.status, JSON.stringify(err));
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
 * Creates an order for manual bank transfer (계좌이체).
 * Skips Toss payment — sets order to awaiting_deposit and artwork to reserved.
 * Admin confirms deposit manually and transitions order to paid.
 */
export async function createBankTransferOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const buyerLocale: ApiLocale = input.locale === 'en' ? 'en' : 'ko';
  const result = await createOrder(input);
  if (!result.success) return result;

  const adminClient = createSupabaseAdminClient();

  const { error: orderUpdateError } = await adminClient
    .from('orders')
    .update({ status: 'awaiting_deposit' })
    .eq('order_no', result.orderNo);

  if (orderUpdateError) {
    // 주문 상태 업데이트 실패 → 생성된 주문을 취소 처리
    await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', result.orderNo);
    return { success: false, error: apiError('order_state_update_failed', buyerLocale) };
  }

  const { data: reservedArtwork, error: artworkUpdateError } = await adminClient
    .from('artworks')
    .update({ status: 'reserved' })
    .eq('id', input.artworkId)
    .eq('status', 'available')
    .select('id');

  // error이거나 0건 matched(동시 구매로 이미 상태 변경됨) → 주문 취소
  if (artworkUpdateError || !reservedArtwork || reservedArtwork.length === 0) {
    await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', result.orderNo);
    return { success: false, error: apiError('artwork_sold_out', buyerLocale) };
  }

  // artwork available → reserved 반영
  revalidatePublicArtworkSurfaces();
  revalidatePath(`/artworks/${input.artworkId}`);
  revalidatePath(`/en/artworks/${input.artworkId}`);

  return result;
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
  const rl = rateLimit(`cancelPendingOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_no', orderNo)
    .eq('status', 'pending_payment')
    .eq('buyer_email', buyerEmail.trim().toLowerCase());
}
