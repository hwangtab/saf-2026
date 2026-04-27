'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { logAdminAction } from './activity-log-writer';
import { deriveAndSyncArtworkStatus } from './admin-artworks';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import type { OrderStatus } from '@/lib/integrations/toss/types';

export type AdminOrderListItem = {
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

export type OrderDetail = AdminOrderListItem & {
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

export async function getOrders(filters: OrderFilters = {}): Promise<AdminOrderListItem[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  let query = supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, buyer_name, buyer_phone, created_at, paid_at, artwork_id, artworks(title, images, artists(name_ko))'
    )
    .order('created_at', { ascending: false });

  if (filters.status) {
    query = query.eq('status', filters.status);
  }

  if (filters.q) {
    // PostgREST .or() 구문 파싱을 깨뜨릴 수 있는 문자(쉼표·괄호·따옴표·역슬래시)와
    // ilike 와일드카드(%·_)를 제거. 100자 상한으로 페이로드 폭주 차단.
    const q = filters.q
      .trim()
      .slice(0, 100)
      .replace(/[,()"\\%_*]/g, '');
    if (q) {
      query = query.or(
        `order_no.ilike.%${q}%,buyer_name.ilike.%${q}%,buyer_phone.ilike.%${q}%,buyer_email.ilike.%${q}%`
      );
    }
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => {
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
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, item_amount, shipping_amount, buyer_name, buyer_phone, shipping_name, shipping_phone, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, created_at, paid_at, cancelled_at, refunded_at, artwork_id, artworks(title, images, artists(name_ko))'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;

  // Fetch payment record
  const { data: payment } = await supabase
    .from('payments')
    .select('payment_key, status, method, approved_at, confirm_response')
    .eq('order_id', orderId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Fetch artwork_sales record
  const { data: sale } = await supabase
    .from('artwork_sales')
    .select('id, voided_at')
    .eq('order_id', orderId)
    .limit(1)
    .maybeSingle();

  const artwork = Array.isArray(order.artworks) ? order.artworks[0] : order.artworks;
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
    item_amount: order.item_amount ?? order.total_amount,
    shipping_amount: order.shipping_amount ?? 0,
    buyer_name: order.buyer_name ?? null,
    buyer_phone: order.buyer_phone ?? null,
    shipping_name: order.shipping_name ?? null,
    shipping_phone: order.shipping_phone ?? null,
    shipping_address: order.shipping_address ?? null,
    shipping_address_detail: order.shipping_address_detail ?? null,
    shipping_memo: order.shipping_memo ?? null,
    created_at: order.created_at,
    paid_at: order.paid_at ?? null,
    cancelled_at: order.cancelled_at ?? null,
    refunded_at: order.refunded_at ?? null,
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
    shipping_carrier: order.shipping_carrier ?? null,
    tracking_number: order.tracking_number ?? null,
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
  const supabase = await requireAdminClient();

  const { orderId, cancelReason, refundReceiveAccount } = input;

  if (!cancelReason.trim()) throw new Error('취소 사유를 입력해주세요.');

  // 1. Fetch order + payment (must be paid | preparing)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, artwork_id, buyer_name, buyer_phone, buyer_email, metadata'
    )
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
    .maybeSingle();

  const hasTossPayment = !!payment?.payment_key;

  const now = new Date().toISOString();

  if (hasTossPayment) {
    // 2a. Toss 결제 — Toss Cancel API 호출 (provider 매칭 시크릿 사용)
    const provider = resolveOrderProvider(order.metadata);
    const cancelResult = await cancelPayment(
      payment!.payment_key!,
      {
        cancelReason: cancelReason.trim(),
        ...(refundReceiveAccount ? { refundReceiveAccount } : {}),
      },
      `refund-${order.order_no}`,
      provider
    );

    if (!cancelResult.success) {
      throw new Error(
        `TossPayments 취소 실패: ${cancelResult.error.message || cancelResult.error.code}`
      );
    }

    // 2b. Update payment status
    if (payment?.id) {
      const { error: paymentUpdateError } = await supabase
        .from('payments')
        .update({ status: 'CANCELED', cancelled_at: now })
        .eq('id', payment.id);
      if (paymentUpdateError) {
        console.error('[refundOrder] payment status UPDATE failed:', paymentUpdateError);
      }
    }
  }
  // 계좌이체 주문은 Toss API 없이 진행 (실제 환불은 관리자가 외부에서 수동 처리)

  // 3. Update orders.status → refunded (idempotency: WHERE status IN ('paid','preparing'))
  const { error: orderUpdateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', orderId)
    .in('status', ['paid', 'preparing']);

  if (orderUpdateError) throw orderUpdateError;

  // 4. 관리자 + 구매자 환불 이메일 발송 (fire-and-forget)
  void (async () => {
    try {
      const refundInfo = await getOrderNotificationInfo(supabase, { id: order.id });

      if (refundInfo) {
        void notifyEmail(
          'warning',
          '주문 환불 처리 (관리자)',
          buildAdminNotificationFields(refundInfo, {
            환불사유: cancelReason.trim(),
            환불방식: hasTossPayment ? 'Toss API 자동 취소' : '계좌이체 수동 처리',
          })
        );
      }

      if (order.buyer_email) {
        void sendBuyerEmail(
          order.buyer_email,
          'refunded',
          {
            orderNo: order.order_no,
            buyerName: order.buyer_name ?? '',
            artworkTitle: refundInfo?.artworkTitle ?? '',
            artistName: refundInfo?.artistName ?? '',
            amount: order.total_amount,
            itemAmount: refundInfo?.itemAmount,
            shippingAmount: refundInfo?.shippingAmount,
          },
          extractBuyerLocale(order.metadata)
        );
      }
    } catch (err) {
      console.error('[refundOrder] email failed:', err);
    }
  })();

  // 5. Void artwork_sales record
  const { data: sale } = await supabase
    .from('artwork_sales')
    .select('id')
    .eq('order_id', orderId)
    .is('voided_at', null)
    .limit(1)
    .maybeSingle();

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
      payment_key: payment?.payment_key ?? null,
      is_bank_transfer: !hasTossPayment,
    },
    admin.id,
    {
      summary: `주문 환불: ${order.order_no} (${order.buyer_name || '구매자 미상'}, ₩${order.total_amount.toLocaleString()})`,
      reversible: false,
    }
  );

  if (order.artwork_id) {
    revalidatePublicArtworkSurfaces();
    revalidatePath(`/artworks/${order.artwork_id}`);
    revalidatePath(`/en/artworks/${order.artwork_id}`);
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

const VALID_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ['cancelled'],
  awaiting_deposit: ['paid', 'cancelled'],
  paid: ['preparing'],
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
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status, buyer_email, buyer_name, artwork_id, metadata')
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

  if (newStatus === 'cancelled') {
    updatePayload.cancelled_at = new Date().toISOString();
  }

  if (newStatus === 'shipped' && trackingInfo?.carrier) {
    updatePayload.shipping_carrier = trackingInfo.carrier;
    updatePayload.tracking_number = trackingInfo.trackingNumber || null;
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update(updatePayload)
    .eq('id', orderId)
    .eq('status', order.status)
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
  }

  // paid → cancelled: artwork_sales void + 작품 상태 복원
  if (order.status === 'paid' && newStatus === 'cancelled') {
    const now = new Date().toISOString();
    const { data: sale } = await supabase
      .from('artwork_sales')
      .select('id')
      .eq('order_id', orderId)
      .is('voided_at', null)
      .limit(1)
      .maybeSingle();

    if (sale) {
      await supabase
        .from('artwork_sales')
        .update({ voided_at: now, void_reason: 'admin_cancelled' })
        .eq('id', sale.id);
    }

    if (order.artwork_id) {
      await deriveAndSyncArtworkStatus(supabase, order.artwork_id);
      revalidatePublicArtworkSurfaces();
      revalidatePath(`/artworks/${order.artwork_id}`);
      revalidatePath(`/en/artworks/${order.artwork_id}`);
    }
  }

  // awaiting_deposit → cancelled: artwork reserved→available 복원
  if (order.status === 'awaiting_deposit' && newStatus === 'cancelled') {
    if (order.artwork_id) {
      const now = new Date().toISOString();
      await supabase
        .from('artworks')
        .update({ status: 'available', updated_at: now })
        .eq('id', order.artwork_id)
        .eq('status', 'reserved');
      revalidatePublicArtworkSurfaces();
      revalidatePath(`/artworks/${order.artwork_id}`);
      revalidatePath(`/en/artworks/${order.artwork_id}`);
    }
  }

  await logAdminAction(
    'order_status_updated',
    'order',
    orderId,
    { order_no: order.order_no, from_status: order.status, to_status: newStatus, ...trackingInfo },
    admin.id,
    { summary: `주문 상태 변경: ${order.order_no} (${order.status} → ${newStatus})` }
  );

  // 구매자 배송 이메일 발송 (fire-and-forget)
  if (order.buyer_email && (newStatus === 'shipped' || newStatus === 'delivered')) {
    void (async () => {
      try {
        const info = await getOrderNotificationInfo(supabase, { id: order.id });
        const locale = extractBuyerLocale(order.metadata);
        const shipping = info
          ? {
              name: info.shippingName,
              phone: info.shippingPhone,
              address: info.shippingAddress,
              memo: info.shippingMemo,
            }
          : undefined;
        if (newStatus === 'shipped') {
          void sendBuyerEmail(
            order.buyer_email!,
            'shipped',
            {
              orderNo: order.order_no,
              buyerName: order.buyer_name ?? '',
              artworkTitle: info?.artworkTitle ?? '',
              artistName: info?.artistName ?? '',
              amount: 0,
              carrier: trackingInfo?.carrier ?? '',
              trackingNumber: trackingInfo?.trackingNumber,
              shipping,
            },
            locale
          );
        } else {
          void sendBuyerEmail(
            order.buyer_email!,
            'delivered',
            {
              orderNo: order.order_no,
              buyerName: order.buyer_name ?? '',
              artworkTitle: info?.artworkTitle ?? '',
              artistName: info?.artistName ?? '',
              amount: 0,
              shipping,
            },
            locale
          );
        }
      } catch (err) {
        console.error('[updateOrderStatus] email failed:', err);
      }
    })();
  }

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function updateTrackingInfo(orderId: string, carrier: string, trackingNumber: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

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
    .eq('id', orderId)
    .in('status', ['shipped', 'delivered']);

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

// ─── 입금 확인 (awaiting_deposit → paid) ─────────────────────────────────────

export async function confirmDeposit(orderId: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, artwork_id, total_amount, buyer_name, buyer_phone, buyer_email, metadata'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(`입금 확인은 입금 대기 상태에서만 가능합니다. (현재 상태: ${order.status})`);
  }

  const now = new Date().toISOString();

  // 1. 주문 상태 → paid (WHERE status = 'awaiting_deposit' 멱등성 가드)
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'paid', paid_at: now, updated_at: now })
    .eq('id', orderId)
    .eq('status', 'awaiting_deposit')
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
  }

  // 2. artwork_sales 생성 — DB 트리거가 artwork reserved→sold 처리
  if (order.artwork_id) {
    const { error: salesError } = await supabase.from('artwork_sales').insert({
      artwork_id: order.artwork_id,
      sale_price: order.total_amount,
      quantity: 1,
      source: 'manual',
      source_detail: 'bank_transfer',
      order_id: order.id,
      external_order_id: order.order_no,
      buyer_name: order.buyer_name,
      buyer_phone: order.buyer_phone,
      sold_at: now,
    });
    if (salesError) {
      console.error('[confirmDeposit] artwork_sales INSERT 실패:', salesError);
      void notifyEmail('error', '입금 확인 후 판매 기록 생성 실패', {
        주문번호: order.order_no,
        주문ID: orderId,
        에러: salesError.message,
        참고: '입금 확인 완료, 판매 기록만 누락 — 수동 확인 필요',
      });
    }

    if (!salesError) {
      await deriveAndSyncArtworkStatus(supabase, order.artwork_id);
    }
  }

  // 3. 관리자 + 구매자 입금 확인 이메일 발송 (fire-and-forget)
  void (async () => {
    try {
      const info = await getOrderNotificationInfo(supabase, { id: order.id });

      if (info) {
        void notifyEmail(
          'payment',
          '계좌이체 입금 확인 (관리자 처리)',
          buildAdminNotificationFields(info, { 처리자: admin.id })
        );
      }

      if (order.buyer_email) {
        void sendBuyerEmail(
          order.buyer_email,
          'deposit_confirmed',
          {
            orderNo: order.order_no,
            buyerName: order.buyer_name ?? '',
            artworkTitle: info?.artworkTitle ?? '',
            artistName: info?.artistName ?? '',
            amount: order.total_amount,
            itemAmount: info?.itemAmount,
            shippingAmount: info?.shippingAmount,
            shipping: info
              ? {
                  name: info.shippingName,
                  phone: info.shippingPhone,
                  address: info.shippingAddress,
                  memo: info.shippingMemo,
                }
              : undefined,
          },
          extractBuyerLocale(order.metadata)
        );
      }
    } catch (err) {
      console.error('[confirmDeposit] email failed:', err);
    }
  })();

  // 4. 로그
  await logAdminAction(
    'order_deposit_confirmed',
    'order',
    orderId,
    {
      order_no: order.order_no,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
    },
    admin.id,
    {
      summary: `입금 확인: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, ₩${order.total_amount.toLocaleString()})`,
    }
  );

  if (order.artwork_id) {
    revalidatePublicArtworkSurfaces();
    revalidatePath(`/artworks/${order.artwork_id}`);
    revalidatePath(`/en/artworks/${order.artwork_id}`);
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

// ─── 입금대기 취소 (awaiting_deposit → cancelled) ────────────────────────────

export async function cancelAwaitingOrder(orderId: string, cancelReason: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  if (!cancelReason.trim()) throw new Error('취소 사유를 입력해주세요.');

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status, artwork_id, buyer_name, buyer_email, total_amount, metadata')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(`입금 대기 상태에서만 취소할 수 있습니다. (현재 상태: ${order.status})`);
  }

  const now = new Date().toISOString();

  // 1. 주문 취소
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
    .eq('id', orderId)
    .eq('status', 'awaiting_deposit')
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침 후 다시 시도해주세요.');
  }

  // 2. artwork reserved→available 직접 복원
  // artwork_sales 레코드가 없어 deriveAndSyncArtworkStatus가 reserved를 건드리지 않으므로 직접 업데이트
  if (order.artwork_id) {
    await supabase
      .from('artworks')
      .update({ status: 'available', updated_at: now })
      .eq('id', order.artwork_id)
      .eq('status', 'reserved'); // 멱등성: reserved 상태일 때만 변경
  }

  // 3. 관리자 + 구매자 취소 이메일 발송 (fire-and-forget)
  void (async () => {
    try {
      const info = await getOrderNotificationInfo(supabase, { id: order.id });

      if (info) {
        void notifyEmail(
          'warning',
          '입금대기 주문 취소 (관리자 처리)',
          buildAdminNotificationFields(info, { 취소사유: cancelReason.trim() })
        );
      }

      if (order.buyer_email) {
        void sendBuyerEmail(
          order.buyer_email,
          'auto_cancelled',
          {
            orderNo: order.order_no,
            buyerName: order.buyer_name ?? '',
            artworkTitle: info?.artworkTitle ?? '',
            artistName: info?.artistName ?? '',
            amount: order.total_amount,
          },
          extractBuyerLocale(order.metadata)
        );
      }
    } catch (err) {
      console.error('[cancelAwaitingOrder] email failed:', err);
    }
  })();

  // 4. 로그
  await logAdminAction(
    'order_awaiting_cancelled',
    'order',
    orderId,
    {
      order_no: order.order_no,
      reason: cancelReason,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
    },
    admin.id,
    {
      summary: `입금대기 주문 취소: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, 사유: ${cancelReason})`,
    }
  );

  if (order.artwork_id) {
    revalidatePublicArtworkSurfaces();
    revalidatePath(`/artworks/${order.artwork_id}`);
    revalidatePath(`/en/artworks/${order.artwork_id}`);
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
