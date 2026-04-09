'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { logAdminAction } from './admin-logs';
import { deriveAndSyncArtworkStatus } from './admin-artworks';
import type { OrderStatus } from '@/lib/integrations/toss/types';

export type OrderListItem = {
  id: string;
  order_no: string;
  status: OrderStatus;
  total_amount: number;
  buyer_name: string | null;
  buyer_phone: string | null;
  created_at: string;
  paid_at: string | null;
  artwork_id: string | null;
  artwork_title: string | null;
  artwork_image: string | null;
  artist_name: string | null;
  payment_method: string | null;
};

export type OrderDetail = OrderListItem & {
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_address_detail: string | null;
  shipping_memo: string | null;
  item_amount: number;
  shipping_amount: number;
  cancelled_at: string | null;
  refunded_at: string | null;
  payment_key: string | null;
  payment_status: string | null;
  payment_method_detail: string | null;
  approved_at: string | null;
  virtual_account_number: string | null;
  virtual_account_bank: string | null;
  virtual_account_due_date: string | null;
  sale_id: string | null;
  sale_voided: boolean;
  shipping_carrier: string | null;
  tracking_number: string | null;
};

export type OrderFilters = {
  status?: string;
  q?: string;
};

export async function getOrders(filters: OrderFilters = {}): Promise<OrderListItem[]> {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  let query = supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, buyer_name, buyer_phone, created_at, paid_at, artwork_id, artworks(title, images, artists(name_ko))'
    )
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row: any) => {
    const artwork = Array.isArray(row.artworks) ? row.artworks[0] : row.artworks;
    const images = Array.isArray(artwork?.images) ? artwork.images : [];
    const artistRow = artwork?.artists;
    const artistName = Array.isArray(artistRow) ? artistRow[0]?.name_ko : artistRow?.name_ko;
    return {
      id: row.id,
      order_no: row.order_no,
      status: row.status as OrderStatus,
      total_amount: row.total_amount,
      buyer_name: row.buyer_name,
      buyer_phone: row.buyer_phone,
      created_at: row.created_at,
      paid_at: row.paid_at,
      artwork_id: row.artwork_id,
      artwork_title: artwork?.title ?? null,
      artwork_image: images[0] ?? null,
      artist_name: artistName ?? null,
      payment_method: null,
    };
  });
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, item_amount, shipping_amount, buyer_name, buyer_phone, shipping_name, shipping_phone, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, created_at, paid_at, cancelled_at, refunded_at, artwork_id, artworks(title, images, artists(name_ko))'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) return null;

  // Fetch payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('payment_key, status, method, approved_at, confirm_response')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  // Fetch artwork_sales record
  const { data: sale } = await supabase
    .from('artwork_sales')
    .select('id, voided_at')
    .eq('order_id', orderId)
    .limit(1)
    .single();

  const artwork = Array.isArray((order as any).artworks)
    ? (order as any).artworks[0]
    : (order as any).artworks;
  const images = Array.isArray(artwork?.images) ? artwork.images : [];
  const artistRow = artwork?.artists;
  const artistName = Array.isArray(artistRow) ? artistRow[0]?.name_ko : artistRow?.name_ko;

  const confirmResponse = (payment?.confirm_response as Record<string, unknown> | null) ?? null;
  const virtualAccount =
    (confirmResponse?.virtualAccount as Record<string, unknown> | null) ?? null;

  return {
    id: order.id,
    order_no: order.order_no,
    status: order.status as OrderStatus,
    total_amount: order.total_amount,
    item_amount: (order as any).item_amount ?? order.total_amount,
    shipping_amount: (order as any).shipping_amount ?? 0,
    buyer_name: order.buyer_name ?? null,
    buyer_phone: (order as any).buyer_phone ?? null,
    shipping_name: (order as any).shipping_name ?? null,
    shipping_phone: (order as any).shipping_phone ?? null,
    shipping_address: (order as any).shipping_address ?? null,
    shipping_address_detail: (order as any).shipping_address_detail ?? null,
    shipping_memo: (order as any).shipping_memo ?? null,
    created_at: order.created_at,
    paid_at: (order as any).paid_at ?? null,
    cancelled_at: (order as any).cancelled_at ?? null,
    refunded_at: (order as any).refunded_at ?? null,
    artwork_id: order.artwork_id ?? null,
    artwork_title: artwork?.title ?? null,
    artwork_image: images[0] ?? null,
    artist_name: artistName ?? null,
    payment_key: payment?.payment_key ?? null,
    payment_status: payment?.status ?? null,
    payment_method: payment?.method ?? null,
    payment_method_detail: payment?.method ?? null,
    approved_at: payment?.approved_at ?? null,
    virtual_account_number:
      typeof virtualAccount?.accountNumber === 'string' ? virtualAccount.accountNumber : null,
    virtual_account_bank:
      typeof virtualAccount?.bankName === 'string' ? virtualAccount.bankName : null,
    virtual_account_due_date:
      typeof virtualAccount?.dueDate === 'string' ? virtualAccount.dueDate : null,
    sale_id: sale?.id ?? null,
    sale_voided: !!sale?.voided_at,
    shipping_carrier: (order as any).shipping_carrier ?? null,
    tracking_number: (order as any).tracking_number ?? null,
  };
}

export type RefundInput = {
  orderId: string;
  cancelReason: string;
  refundReceiveAccount?: {
    bank: string;
    accountNumber: string;
    holderName: string;
  };
};

export async function refundOrder(input: RefundInput) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { orderId, cancelReason, refundReceiveAccount } = input;

  if (!cancelReason.trim()) throw new Error('취소 사유를 입력해주세요.');

  // 1. Fetch order + payment (must be paid | preparing)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, order_no, status, total_amount, artwork_id, buyer_name, buyer_phone')
    .eq('id', orderId)
    .single();

  if (orderError || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (!['paid', 'preparing'].includes(order.status)) {
    throw new Error(`환불 가능한 상태가 아닙니다. (현재 상태: ${order.status})`);
  }

  const { data: payment } = await supabase
    .from('payments')
    .select('id, payment_key, method, status')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!payment?.payment_key) throw new Error('결제 정보를 찾을 수 없습니다.');

  // 2. Call Toss cancel API — idempotency key = order_no
  const cancelResult = await cancelPayment(
    payment.payment_key,
    {
      cancelReason: cancelReason.trim(),
      ...(refundReceiveAccount ? { refundReceiveAccount } : {}),
    },
    `refund-${order.order_no}`
  );

  if (!cancelResult.success) {
    throw new Error(
      `TossPayments 취소 실패: ${cancelResult.error.message || cancelResult.error.code}`
    );
  }

  const now = new Date().toISOString();

  // 3. Update orders.status → refunded (idempotency: WHERE status IN ('paid','preparing'))
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', orderId)
    .in('status', ['paid', 'preparing']);

  if (orderUpdateError) throw orderUpdateError;

  // 4. Update payment status
  await supabase
    .from('payments')
    .update({ status: 'CANCELED', cancelled_at: now })
    .eq('id', payment.id);

  // 5. Void artwork_sales record
  const { data: sale } = await supabase
    .from('artwork_sales')
    .select('id')
    .eq('order_id', orderId)
    .is('voided_at', null)
    .limit(1)
    .single();

  if (sale) {
    await supabase
      .from('artwork_sales')
      .update({ voided_at: now, void_reason: cancelReason.trim() })
      .eq('id', sale.id);
  }

  // 6. Recalculate artwork status
  if (order.artwork_id) {
    await deriveAndSyncArtworkStatus(supabase, order.artwork_id);
  }

  // 7. Log action
  await logAdminAction(
    'order_refunded',
    'order',
    orderId,
    {
      order_no: order.order_no,
      reason: cancelReason,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
      payment_key: payment.payment_key,
    },
    admin.id,
    {
      summary: `주문 환불: ${order.order_no} (${order.buyer_name || '구매자 미상'}, ₩${order.total_amount.toLocaleString()})`,
      reversible: false,
    }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  awaiting_deposit: ['paid', 'cancelled'],
  paid: ['preparing', 'cancelled'],
  preparing: ['shipped'],
  shipped: ['delivered'],
  delivered: ['completed'],
  completed: [],
  cancelled: [],
  refund_requested: ['refunded'],
  refunded: [],
};

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  trackingInfo?: { carrier: string; trackingNumber: string }
) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');

  const allowedNext = VALID_STATUS_TRANSITIONS[order.status as OrderStatus] ?? [];
  if (!allowedNext.includes(newStatus)) {
    throw new Error(`${order.status} → ${newStatus} 전환은 허용되지 않습니다.`);
  }

  const updatePayload: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  if (newStatus === 'shipped' && trackingInfo?.carrier) {
    updatePayload.shipping_carrier = trackingInfo.carrier;
    updatePayload.tracking_number = trackingInfo.trackingNumber || null;
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId);

  if (updateError) throw updateError;

  await logAdminAction(
    'order_status_updated',
    'order',
    orderId,
    { order_no: order.order_no, from_status: order.status, to_status: newStatus, ...trackingInfo },
    admin.id,
    { summary: `주문 상태 변경: ${order.order_no} (${order.status} → ${newStatus})` }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function updateTrackingInfo(orderId: string, carrier: string, trackingNumber: string) {
  const admin = await requireAdmin();
  const supabase = await createSupabaseAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (!['shipped', 'delivered'].includes(order.status)) {
    throw new Error('배송 중 또는 배송 완료 상태인 주문만 운송장 정보를 수정할 수 있습니다.');
  }

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      shipping_carrier: carrier || null,
      tracking_number: trackingNumber || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', orderId);

  if (updateError) throw updateError;

  await logAdminAction(
    'order_tracking_updated',
    'order',
    orderId,
    { order_no: order.order_no, carrier, tracking_number: trackingNumber },
    admin.id,
    { summary: `운송장 정보 수정: ${order.order_no} (${carrier} ${trackingNumber})` }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
