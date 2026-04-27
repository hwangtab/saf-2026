'use server';

import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { parsePrice } from '@/lib/parsePrice';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
import { rateLimit } from '@/lib/rate-limit';
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
        metadata: { locale: buyerLocale, payment_provider: 'widget' },
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
