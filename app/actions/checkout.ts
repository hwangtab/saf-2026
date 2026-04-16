'use server';

import { headers } from 'next/headers';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
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
  } = input;

  // Rate limiting — IP 기준 분당 10회
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const rl = rateLimit(`createOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.' };
  }

  // Basic validation
  if (!artworkId || !buyerName || !buyerEmail || !buyerPhone) {
    return { success: false, error: '필수 정보를 입력해주세요.' };
  }
  if (!shippingAddress || !shippingPostalCode || !shippingAddressDetail) {
    return { success: false, error: '배송지 정보를 입력해주세요.' };
  }

  const adminClient = createSupabaseAdminClient();

  // Fetch artwork (parse price server-side — never trust client)
  const { data: artwork, error: artworkError } = await adminClient
    .from('artworks')
    .select('id, title, price, status, artists(name_ko)')
    .eq('id', artworkId)
    .single();

  if (artworkError || !artwork) {
    return { success: false, error: '작품을 찾을 수 없습니다.' };
  }

  // 동일 구매자의 같은 작품에 대한 기존 pending_payment 주문 자동 정리
  // (탭 닫기, 뒤로가기 등으로 catch 블록이 실행되지 못한 경우 대비)
  // buyer_email 필터로 다른 구매자의 진행 중인 주문은 취소하지 않음
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('artwork_id', artworkId)
    .eq('buyer_email', buyerEmail)
    .eq('status', 'pending_payment');

  // Check availability via RPC
  const { data: availResult, error: availError } = await adminClient.rpc(
    'check_artwork_availability',
    { p_artwork_id: artworkId }
  );

  if (availError) {
    return { success: false, error: '재고 확인 중 오류가 발생했습니다.' };
  }

  const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
  if (!isAvailable) {
    return { success: false, error: '이미 판매된 작품입니다.' };
  }

  // Parse price server-side
  const itemAmount = parsePrice(artwork.price);
  if (!Number.isFinite(itemAmount) || itemAmount <= 0) {
    return { success: false, error: '작품 가격 정보를 확인할 수 없습니다.' };
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
      buyer_email: buyerEmail,
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
    })
    .select('id')
    .single();

  if (insertError || !order) {
    return { success: false, error: '주문 생성 중 오류가 발생했습니다.' };
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
    return { success: false, error: '결제 서버 연결에 실패했습니다.' };
  }

  if (!response.ok) {
    let err: TossErrorResponse = { code: 'UNKNOWN', message: '결제 세션 생성에 실패했습니다.' };
    try {
      err = await response.json();
    } catch {}
    console.error('[initiatePayment] Toss API error:', response.status, JSON.stringify(err));
    return { success: false, error: err.message || '결제 세션 생성에 실패했습니다.' };
  }

  const data = await response.json();
  const checkoutUrl = (data as { checkout?: { url?: string } })?.checkout?.url;
  if (!checkoutUrl) {
    return { success: false, error: '결제 URL을 받지 못했습니다.' };
  }

  return { success: true, checkoutUrl };
}

/**
 * Creates an order for manual bank transfer (계좌이체).
 * Skips Toss payment — sets order to awaiting_deposit and artwork to reserved.
 * Admin confirms deposit manually and transitions order to paid.
 */
export async function createBankTransferOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
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
    return { success: false, error: '주문 상태 변경 중 오류가 발생했습니다.' };
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
    return { success: false, error: '이미 판매된 작품입니다.' };
  }

  return result;
}

/**
 * Cancels a pending_payment order when the user abandons the payment widget.
 * Only cancels orders in 'pending_payment' status — safe to call speculatively.
 */
export async function cancelPendingOrder(orderNo: string, buyerEmail: string): Promise<void> {
  if (!orderNo || !buyerEmail) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_no', orderNo)
    .eq('status', 'pending_payment')
    .eq('buyer_email', buyerEmail.trim().toLowerCase());
}
