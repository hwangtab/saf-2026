'use server';

import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { parsePrice } from '@/lib/parsePrice';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';

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

  // Basic validation
  if (!artworkId || !buyerName || !buyerEmail || !buyerPhone) {
    return { success: false, error: '필수 정보를 입력해주세요.' };
  }
  if (!shippingAddress || !shippingPostalCode) {
    return { success: false, error: '배송지 정보를 입력해주세요.' };
  }

  const adminClient = createSupabaseAdminClient();

  // Fetch artwork (parse price server-side — never trust client)
  const { data: artwork, error: artworkError } = await adminClient
    .from('artworks')
    .select('id, title, price, status, edition_type, edition_limit, artists(name_ko)')
    .eq('id', artworkId)
    .single();

  if (artworkError || !artwork) {
    return { success: false, error: '작품을 찾을 수 없습니다.' };
  }

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

/**
 * Cancels a pending_payment order when the user abandons the payment widget.
 * Only cancels orders in 'pending_payment' status — safe to call speculatively.
 */
export async function cancelPendingOrder(orderNo: string): Promise<void> {
  if (!orderNo) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_no', orderNo)
    .eq('status', 'pending_payment');
}
