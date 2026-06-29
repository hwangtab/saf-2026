'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { logAdminAction } from './activity-log-writer';
import { deriveAndSyncArtworkStatus } from './admin-artworks';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import { releaseReservedArtworksIfUnowned } from '@/lib/orders/reservations';
import {
  getRepresentativeArtwork,
  formatRepresentativeTitle,
} from '@/lib/orders/representative-artwork';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { runAllSettled } from '@/lib/server/after-response';
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
  escalated_at: string | null;
  sla_overdue: boolean;
};

/**
 * 다품목(cart) 주문의 개별 라인 아이템 — 배송 시 직원이 N개 작품 전체를 봐야 하므로 전 라인 반환.
 * 단건 주문(order_items 1행 또는 legacy artwork_id)도 동일 구조로 표현.
 */
export type OrderLineItem = {
  artwork_id: string | null;
  artwork_title: string | null;
  artist_name: string | null;
  quantity: number;
  unit_price: number | null;
};

export type OrderDetail = AdminOrderListItem & {
  /** 전체 라인 아이템. 다품목은 N건, 단건은 1건. 빈 배열이면 legacy 단건(artwork_id) — UI는 artwork_title fallback. */
  line_items: OrderLineItem[];
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
  /** orders.metadata.payment_provider — 'domestic'|'overseas'|'manual_bank_transfer'|'widget'|'api_v1' */
  payment_provider: string | null;
  /** 간편결제사 (payments.confirm_response.easyPay.provider — 예: '네이버페이', '카카오페이', '토스페이'). 간편결제가 아니면 null */
  payment_easypay_provider: string | null;
  /** 관리자가 자동취소를 보류한 입금대기 주문 (입금 기한 무한 연장) */
  deposit_auto_cancel_paused: boolean;
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

  const SLA_HOURS = 72;
  const slaThreshold = new Date(Date.now() - SLA_HOURS * 3600 * 1000);

  // PostgREST 기본 상한 1000행 — 초과 시 SLA 위반 행 유실 방지용 명시적 상한
  let query = supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, buyer_name, buyer_phone, created_at, paid_at, escalated_at, artwork_id, artworks(title, images, artists(name_ko)), order_items(artworks(title, images, artists(name_ko)))'
    )
    .order('created_at', { ascending: false })
    .limit(2000);

  // virtual filter 값('sla_overdue', 'escalated')은 DB 컬럼이 아니므로 제거
  const VIRTUAL_STATUS_VALUES = new Set(['sla_overdue', 'escalated']);
  if (filters.status && !VIRTUAL_STATUS_VALUES.has(filters.status)) {
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
    // 다품목(orders.artwork_id NULL) 주문은 order_items 대표작품 "외 N건"으로 표시. 단건은 artworks fallback.
    const rep = getRepresentativeArtwork(row.order_items);

    const artwork = Array.isArray(row.artworks) ? row.artworks[0] : row.artworks;
    const images = Array.isArray(artwork?.images) ? artwork.images : [];
    const artistRow = artwork?.artists;
    const singleArtistName = Array.isArray(artistRow) ? artistRow[0]?.name_ko : artistRow?.name_ko;

    const artworkTitle =
      rep.count > 0 && rep.title
        ? formatRepresentativeTitle(rep.title, rep.count, 'ko')
        : (artwork?.title ?? null);
    const artworkImage = rep.count > 0 ? rep.image : (images[0] ?? null);
    const artistName = rep.count > 0 ? rep.artistName : (singleArtistName ?? null);

    const status = row.status as OrderStatus;
    const sla_overdue =
      row.paid_at != null &&
      (status === 'paid' || status === 'preparing') &&
      new Date(row.paid_at) < slaThreshold;

    return {
      id: row.id,
      order_no: row.order_no,
      status,
      total_amount: row.total_amount,
      buyer_name: row.buyer_name,
      buyer_phone: row.buyer_phone,
      created_at: row.created_at,
      paid_at: row.paid_at,
      artwork_id: row.artwork_id,
      artwork_title: artworkTitle,
      artwork_image: artworkImage,
      artist_name: artistName,
      payment_method: null,
      escalated_at: (row.escalated_at as string | null) ?? null,
      sla_overdue,
    };
  });
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  await requireAdmin();
  const supabase = await requireAdminClient();

  const SLA_HOURS = 72;
  const slaThreshold = new Date(Date.now() - SLA_HOURS * 3600 * 1000);

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, item_amount, shipping_amount, buyer_name, buyer_phone, shipping_name, shipping_phone, shipping_address, shipping_address_detail, shipping_memo, shipping_carrier, tracking_number, created_at, paid_at, cancelled_at, refunded_at, escalated_at, artwork_id, metadata, deposit_auto_cancel_paused, artworks(title, images, artists(name_ko)), order_items(quantity, unit_price, artwork_id, artworks(title, images, artists(name_ko)))'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (error || !order) return null;

  // payment + sale은 order에 의존하지 않으므로 병렬 fetch
  const [{ data: payment }, { data: sale }] = await Promise.all([
    supabase
      .from('payments')
      .select('payment_key, status, method, approved_at, confirm_response')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('artwork_sales')
      .select('id, voided_at')
      .eq('order_id', orderId)
      .limit(1)
      .maybeSingle(),
  ]);

  const artwork = Array.isArray(order.artworks) ? order.artworks[0] : order.artworks;
  const images = Array.isArray(artwork?.images) ? artwork.images : [];
  const artistRow = artwork?.artists;
  const singleArtistName = Array.isArray(artistRow) ? artistRow[0]?.name_ko : artistRow?.name_ko;

  // 다품목(orders.artwork_id NULL) 주문: order_items 전 라인을 열거(배송 시 N개 작품 전부 필요).
  // 단건은 order_items 1행(또는 비면 legacy artwork_id) → line_items 1건으로 표현.
  const orderItems = Array.isArray(order.order_items)
    ? order.order_items
    : order.order_items != null
      ? [order.order_items]
      : [];
  const lineItems: OrderLineItem[] = orderItems.map((item) => {
    const itemArtwork = Array.isArray(item.artworks) ? item.artworks[0] : item.artworks;
    const itemArtistRow = itemArtwork?.artists;
    const itemArtistName = Array.isArray(itemArtistRow)
      ? itemArtistRow[0]?.name_ko
      : itemArtistRow?.name_ko;
    return {
      artwork_id: item.artwork_id ?? null,
      artwork_title: itemArtwork?.title ?? null,
      artist_name: itemArtistName ?? null,
      quantity: typeof item.quantity === 'number' ? item.quantity : 1,
      unit_price: typeof item.unit_price === 'number' ? item.unit_price : null,
    };
  });

  // 대표작품: 목록 호환 필드(artwork_title/artist_name/artwork_image)는 다품목이면 "외 N건".
  const rep = getRepresentativeArtwork(order.order_items);
  const repArtworkTitle =
    rep.count > 0 && rep.title
      ? formatRepresentativeTitle(rep.title, rep.count, 'ko')
      : (artwork?.title ?? null);
  const repArtworkImage = rep.count > 0 ? rep.image : (images[0] ?? null);
  const repArtistName = rep.count > 0 ? rep.artistName : (singleArtistName ?? null);

  const confirmResponse = (payment?.confirm_response as Record<string, unknown> | null) ?? null;
  const virtualAccount =
    (confirmResponse?.virtualAccount as Record<string, unknown> | null) ?? null;
  const easyPay = (confirmResponse?.easyPay as Record<string, unknown> | null) ?? null;
  const easyPayProvider =
    typeof easyPay?.provider === 'string' && easyPay.provider.length > 0 ? easyPay.provider : null;

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
    artwork_title: repArtworkTitle,
    artwork_image: repArtworkImage,
    artist_name: repArtistName,
    line_items: lineItems,
    payment_key: payment?.payment_key ?? null,
    payment_status: payment?.status ?? null,
    payment_method: payment?.method ?? null,
    payment_method_detail: payment?.method ?? null,
    payment_provider:
      (order.metadata as { payment_provider?: string } | null)?.payment_provider ?? null,
    payment_easypay_provider: easyPayProvider,
    deposit_auto_cancel_paused: (order.deposit_auto_cancel_paused as boolean | null) ?? false,
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
    escalated_at: (order.escalated_at as string | null) ?? null,
    sla_overdue:
      order.paid_at != null &&
      (order.status === 'paid' || order.status === 'preparing') &&
      new Date(order.paid_at) < slaThreshold,
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

  if (!cancelReason.trim()) throw new Error('취소 사유를 입력해 주세요.');

  // 1. Fetch order + payment (must be paid | preparing)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, total_amount, artwork_id, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
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
  // 결제가 이미 Toss에서 취소된 경우(웹훅 선반영 등) 재취소 호출은 24h 이후 "이미 취소" 에러로
  // 환불이 영구 차단된다. 이미 취소면 Toss 호출을 건너뛰고 DB 정리만 진행한다.
  const tossAlreadyCanceled = payment?.status === 'CANCELED';

  const now = new Date().toISOString();

  if (hasTossPayment && !tossAlreadyCanceled) {
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
  const { data: updatedRows, error: orderUpdateError } = await supabase
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', orderId)
    .in('status', ['paid', 'preparing'])
    .select('id');

  if (orderUpdateError || !updatedRows || updatedRows.length === 0) {
    const refundSyncError = orderUpdateError?.message ?? 'orders update affected 0 rows';
    if (orderUpdateError) {
      console.error('[refundOrder] order status UPDATE failed:', orderUpdateError);
    }
    after(() =>
      runAllSettled('adminOrders.refundOrder.orderSyncFailed.notifications', [
        () =>
          notifyEmail('error', 'Toss 취소 후 주문 상태 반영 실패', {
            주문번호: order.order_no,
            주문ID: order.id,
            paymentKey: payment?.payment_key ?? '',
            환불사유: cancelReason.trim(),
            에러: refundSyncError,
            참고: hasTossPayment
              ? 'Toss 취소는 성공했지만 내부 주문 상태가 refunded로 바뀌지 않았습니다.'
              : '환불 처리 중 내부 주문 상태가 refunded로 바뀌지 않았습니다.',
          }),
        () =>
          logAdminAction('order_refund_sync_failed', 'order', order.id, {
            order_no: order.order_no,
            payment_key: payment?.payment_key ?? null,
            reason: cancelReason.trim(),
            error: refundSyncError,
            has_toss_payment: hasTossPayment,
          }),
      ])
    );
    return { success: false, error: 'ORDER_REFUND_SYNC_FAILED' };
  }

  // 4. 관리자 + 구매자 환불 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  after(async () => {
    try {
      const refundInfo = await getOrderNotificationInfo(supabase, { id: order.id });

      await runAllSettled('adminOrders.refundOrder.notifications', [
        ...(refundInfo
          ? [
              () =>
                notifyEmail(
                  'warning',
                  '주문 환불 처리 (관리자)',
                  buildAdminNotificationFields(refundInfo, {
                    환불사유: cancelReason.trim(),
                    환불방식: hasTossPayment ? 'Toss API 자동 취소' : '계좌이체 수동 처리',
                  })
                ),
            ]
          : []),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
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
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            order.buyer_phone,
            'refunded',
            {
              buyerName: order.buyer_name ?? '',
              artworkTitle: '',
              amount: order.total_amount ?? 0,
            },
            extractBuyerLocale(order.metadata),
            order.order_no ?? undefined
          ),
      ]);
    } catch (err) {
      console.error('[refundOrder] email failed:', err);
    }
  });

  // 5. Void artwork_sales — 다품목 주문은 해당 order의 active 매출 전부 void (단건 주문은 1행만 영향)
  const { error: voidError } = await supabase
    .from('artwork_sales')
    .update({ voided_at: now, void_reason: cancelReason.trim() })
    .eq('order_id', orderId)
    .is('voided_at', null);
  if (voidError) {
    // 환불은 이미 완료(Toss 취소 + 주문 refunded). 판매기록 void 실패 시 매출이 과대 계상되므로 경보.
    console.error('[refundOrder] artwork_sales void failed:', voidError);
    after(() =>
      notifyEmail('error', '환불 후 판매기록 void 실패 — 수동 처리 필요', {
        주문번호: order.order_no,
        주문ID: orderId,
        에러: voidError.message,
      })
    );
  }

  // 6. Recalculate artwork status — order_items 라인별로 (legacy 단건은 artwork_id fallback).
  // void 이후 호출해야 활성 매출 없음 기준으로 sold→available 복원이 정확.
  const lineItems = extractLineItems(order);
  const artworkIds =
    lineItems.length > 0
      ? lineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];
  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(supabase, artworkId);
  }

  // 6b. reserved 작품 해제 — 다품목 VA 주문에서 안 팔린 unique 작품이 reserved로 남는 재고누수 차단.
  // deriveAndSyncArtworkStatus 이후에도 다른 활성 주문이 없는 예약만 해제한다.
  // void→resync 후에 호출해야 안전. (awaiting_deposit→cancelled 분기와 동일 패턴)
  const refundReleaseResult = await releaseReservedArtworksIfUnowned(supabase, artworkIds, now);
  if (refundReleaseResult.errors) {
    console.error('[refundOrder] reserved artwork release failed:', refundReleaseResult.errors);
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
      summary: `주문 환불: ${order.order_no} (${order.buyer_name || '구매자 미상'}, ₩${order.total_amount.toLocaleString('ko-KR')})`,
      reversible: false,
    }
  );

  for (const artworkId of artworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
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
    .select(
      'id, order_no, status, buyer_email, buyer_name, buyer_phone, artwork_id, metadata, order_items(artwork_id, quantity, unit_price)'
    )
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
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  // paid → cancelled: artwork_sales void + 작품 상태 복원 (다품목 카트 주문 지원)
  if (order.status === 'paid' && newStatus === 'cancelled') {
    const now = new Date().toISOString();

    // 해당 order의 active 매출 전부 void (단건 주문은 1행만 영향)
    const { error: voidError } = await supabase
      .from('artwork_sales')
      .update({ voided_at: now, void_reason: 'admin_cancelled' })
      .eq('order_id', orderId)
      .is('voided_at', null);
    if (voidError) {
      console.error('[updateOrderStatus] artwork_sales void 실패:', voidError);
    }

    // 작품 상태 재계산 — order_items 라인별 (legacy 단건은 artwork_id fallback).
    // void 이후 호출해야 활성 매출 없음 기준으로 sold→available 복원이 정확.
    const lineItems = extractLineItems(order);
    const artworkIds =
      lineItems.length > 0
        ? lineItems.map((item) => item.artwork_id)
        : order.artwork_id
          ? [order.artwork_id]
          : [];
    for (const artworkId of artworkIds) {
      await deriveAndSyncArtworkStatus(supabase, artworkId);
    }
    // reserved 작품 해제 — 다품목 VA 주문에서 안 팔린 unique 작품이 reserved로 남는 재고누수 차단.
    // deriveAndSyncArtworkStatus 이후에도 다른 활성 주문이 없는 예약만 해제한다.
    // void→resync 후에 호출해야 안전.
    const transitionReleaseResult = await releaseReservedArtworksIfUnowned(
      supabase,
      artworkIds,
      now
    );
    if (transitionReleaseResult.errors) {
      console.error(
        '[updateOrderStatus] reserved artwork release failed:',
        transitionReleaseResult.errors
      );
    }
    for (const artworkId of artworkIds) {
      revalidatePath(`/artworks/${artworkId}`);
      revalidatePath(`/en/artworks/${artworkId}`);
    }
    if (artworkIds.length > 0) {
      revalidatePublicArtworkSurfaces();
    }
  }

  // awaiting_deposit → cancelled: artwork reserved→available 복원 (다품목 카트 주문 지원)
  if (order.status === 'awaiting_deposit' && newStatus === 'cancelled') {
    const now = new Date().toISOString();
    const lineItems = extractLineItems(order);
    const artworkIds =
      lineItems.length > 0
        ? lineItems.map((item) => item.artwork_id)
        : order.artwork_id
          ? [order.artwork_id]
          : [];
    const cancelTransitionReleaseResult = await releaseReservedArtworksIfUnowned(
      supabase,
      artworkIds,
      now
    );
    if (cancelTransitionReleaseResult.errors) {
      console.error(
        '[updateOrderStatus] awaiting cancel reserved artwork release failed:',
        cancelTransitionReleaseResult.errors
      );
    }
    for (const artworkId of artworkIds) {
      revalidatePath(`/artworks/${artworkId}`);
      revalidatePath(`/en/artworks/${artworkId}`);
    }
    if (artworkIds.length > 0) {
      revalidatePublicArtworkSurfaces();
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

  // 구매자 배송 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  if (order.buyer_email && (newStatus === 'shipped' || newStatus === 'delivered')) {
    after(async () => {
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
          await runAllSettled('adminOrders.updateOrderStatus.shippedNotifications', [
            () =>
              sendBuyerEmail(
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
              ),
            () =>
              sendBuyerSms(
                order.buyer_phone,
                'shipped',
                {
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: info?.artworkTitle ?? '',
                  amount: 0,
                  carrier: trackingInfo?.carrier ?? undefined,
                  trackingNumber: trackingInfo?.trackingNumber ?? undefined,
                },
                locale,
                order.order_no ?? undefined
              ),
          ]);
        } else {
          await runAllSettled('adminOrders.updateOrderStatus.deliveredNotifications', [
            () =>
              sendBuyerEmail(
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
              ),
            () =>
              sendBuyerSms(
                order.buyer_phone,
                'delivered',
                {
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: info?.artworkTitle ?? '',
                  amount: 0,
                },
                locale,
                order.order_no ?? undefined
              ),
          ]);
        }
      } catch (err) {
        console.error('[updateOrderStatus] email failed:', err);
      }
    });
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
      'id, order_no, status, artwork_id, total_amount, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(`입금 확인은 입금 대기 상태에서만 가능합니다. (현재 상태: ${order.status})`);
  }

  const now = new Date().toISOString();

  // 1. 주문 paid 전환 + artwork_sales 기록은 DB RPC에서 한 트랜잭션으로 처리한다.
  //    트리거/제약 실패 시 주문만 paid로 남는 중간 상태가 생기면 안 된다.
  const { data: confirmedRows, error: confirmError } = await supabase.rpc(
    'confirm_bank_transfer_order',
    {
      p_order_id: orderId,
      p_sold_at: now,
    }
  );

  if (confirmError) {
    console.error('[confirmDeposit] confirm_bank_transfer_order RPC failed:', confirmError);
    // 더블셀 차단: enforce_unique_edition_single_active_sale 트리거가 다른 주문이 이미 이 unique
    // 작품을 가져갔을 때 'UNIQUE_EDITION_TAKEN'(P0001)을 던진다. 일시적 DB 오류와 구분해, 운영자가
    // '환불 안내가 필요한 경합 패배'인지 '재시도 가능한 오류'인지 판단할 수 있게 메시지를 분기한다.
    if (confirmError.message.includes('UNIQUE_EDITION_TAKEN')) {
      throw new Error(
        '이미 다른 주문이 결제 완료한 작품입니다. 이 주문은 입금 확인할 수 없으니 구매자에게 환불을 안내해 주세요.'
      );
    }
    throw new Error(
      '판매 기록 생성에 실패해 입금 확인을 중단했습니다. 작품 판매 상태와 주문을 확인해 주세요.'
    );
  }

  const confirmed = Array.isArray(confirmedRows) ? confirmedRows[0] : null;
  const artworkIds = Array.isArray(confirmed?.artwork_ids)
    ? confirmed.artwork_ids.filter((id): id is string => typeof id === 'string' && id.length > 0)
    : [];

  if (artworkIds.length === 0) {
    console.error('[confirmDeposit] confirm_bank_transfer_order returned no artwork ids:', {
      orderId,
      confirmedRows,
    });
    throw new Error(
      '판매 기록 생성에 실패해 입금 확인을 중단했습니다. 작품 판매 상태와 주문을 확인해 주세요.'
    );
  }

  // 2. 작품 상태 재동기화 — RPC 내부 INSERT 트리거 후 방어적으로 한 번 더 맞춘다.
  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(supabase, artworkId);
  }

  // 3. 관리자 + 구매자 입금 확인 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  after(async () => {
    try {
      const info = await getOrderNotificationInfo(supabase, { id: order.id });

      await runAllSettled('adminOrders.confirmDeposit.notifications', [
        ...(info
          ? [
              () =>
                notifyEmail(
                  'payment',
                  '계좌이체 입금 확인 (관리자 처리)',
                  buildAdminNotificationFields(info, { 처리자: admin.id })
                ),
            ]
          : []),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
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
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            order.buyer_phone,
            'deposit_confirmed',
            { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: 0 },
            extractBuyerLocale(order.metadata),
            order.order_no ?? undefined
          ),
      ]);
    } catch (err) {
      console.error('[confirmDeposit] email failed:', err);
    }
  });

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
      summary: `입금 확인: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, ₩${order.total_amount.toLocaleString('ko-KR')})`,
    }
  );

  for (const artworkId of artworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

// ─── 입금대기 취소 (awaiting_deposit → cancelled) ────────────────────────────

/**
 * 입금대기 주문의 자동취소 보류 토글 (무한 연장).
 *
 * paused=true면 expire-stale-orders cron이 만료 대상에서 제외 — 입금 확인하거나 수동 취소할
 * 때까지 계속 유지된다. confirmDeposit은 status('awaiting_deposit')만 보므로, 보류 중에 입금
 * 확인을 눌러도 정상적으로 paid 처리된다. (가상계좌 webhook 취소·수동 취소는 보류와 무관하게 동작)
 */
export async function setDepositAutoCancelPaused(orderId: string, paused: boolean) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { data: order, error } = await supabase
    .from('orders')
    .select('id, order_no, status, buyer_name, total_amount')
    .eq('id', orderId)
    .single();

  if (error || !order) throw new Error('주문을 찾을 수 없습니다.');
  if (order.status !== 'awaiting_deposit') {
    throw new Error(
      `자동취소 보류는 입금 대기 상태에서만 가능합니다. (현재 상태: ${order.status})`
    );
  }

  const now = new Date().toISOString();
  const { data: updatedRows, error: updateError } = await supabase
    .from('orders')
    .update({ deposit_auto_cancel_paused: paused, updated_at: now })
    .eq('id', orderId)
    .eq('status', 'awaiting_deposit')
    .select('id');

  if (updateError) throw updateError;
  if (!updatedRows || updatedRows.length === 0) {
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  await logAdminAction(
    paused ? 'order_auto_cancel_paused' : 'order_auto_cancel_resumed',
    'order',
    orderId,
    {
      order_no: order.order_no,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
    },
    admin.id,
    {
      summary: paused
        ? `자동취소 보류: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}) — 입금 기한 무한 연장`
        : `자동취소 보류 해제: ${order.order_no} (${order.buyer_name ?? '구매자 미상'})`,
    }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function cancelAwaitingOrder(orderId: string, cancelReason: string) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  if (!cancelReason.trim()) throw new Error('취소 사유를 입력해 주세요.');

  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_no, status, artwork_id, buyer_name, buyer_phone, buyer_email, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    )
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
    throw new Error('주문 상태가 변경되었습니다. 새로고침한 뒤 다시 시도해 주세요.');
  }

  // 2. artwork reserved→available 직접 복원 — order_items 라인별 (다품목 카트 주문 지원).
  // artwork_sales 레코드가 없어 deriveAndSyncArtworkStatus가 reserved를 건드리지 않으므로 직접 업데이트.
  // order_items가 비면 legacy 단건 artwork_id fallback.
  const reservedLineItems = extractLineItems(order);
  const reservedArtworkIds =
    reservedLineItems.length > 0
      ? reservedLineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];
  const releaseResult = await releaseReservedArtworksIfUnowned(supabase, reservedArtworkIds, now);
  if (releaseResult.errors) {
    console.error('[cancelAwaitingOrder] artwork restore failed:', releaseResult.errors);
    for (const releaseError of releaseResult.errors) {
      after(() =>
        notifyEmail('error', '입금대기 주문 취소 후 예약 해제 실패', {
          주문번호: order.order_no,
          주문ID: orderId,
          작품ID: releaseError.artworkId,
          에러:
            releaseError.error instanceof Error
              ? releaseError.error.message
              : ((releaseError.error as { message?: string } | null)?.message ??
                String(releaseError.error)),
        })
      );
    }
  }

  // 3. 관리자 + 구매자 취소 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  after(async () => {
    try {
      const info = await getOrderNotificationInfo(supabase, { id: order.id });

      await runAllSettled('adminOrders.cancelAwaitingOrder.notifications', [
        ...(info
          ? [
              () =>
                notifyEmail(
                  'warning',
                  '입금대기 주문 취소 (관리자 처리)',
                  buildAdminNotificationFields(info, { 취소사유: cancelReason.trim() })
                ),
            ]
          : []),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
                  'auto_cancelled',
                  {
                    orderNo: order.order_no,
                    buyerName: order.buyer_name ?? '',
                    artworkTitle: info?.artworkTitle ?? '',
                    artistName: info?.artistName ?? '',
                    amount: order.total_amount,
                  },
                  extractBuyerLocale(order.metadata)
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            order.buyer_phone,
            'auto_cancelled',
            { buyerName: order.buyer_name ?? '', artworkTitle: '', amount: 0 },
            extractBuyerLocale(order.metadata),
            order.order_no ?? undefined
          ),
      ]);
    } catch (err) {
      console.error('[cancelAwaitingOrder] email failed:', err);
    }
  });

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

  for (const artworkId of reservedArtworkIds) {
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (reservedArtworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function setOrderEscalation(
  orderId: string,
  note: string | null,
  expectedEscalatedAt: string | null
): Promise<{ success: true }> {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const escalatedAt = note ? new Date().toISOString() : null;

  let query = supabase.from('orders').update({ escalated_at: escalatedAt }).eq('id', orderId);

  // 낙관적 잠금: 다른 운영자가 먼저 변경했으면 0행 반환 → 충돌 에러
  if (expectedEscalatedAt === null) {
    query = query.is('escalated_at', null);
  } else {
    query = query.eq('escalated_at', expectedEscalatedAt);
  }

  const { data, error } = await query.select('order_no').maybeSingle();

  if (error) throw error;
  if (!data)
    throw new Error('주문 상태가 변경되었습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.');

  // 에스컬레이션 메모는 admin-only 테이블에 별도 저장 (orders 테이블에서 PII 격리)
  if (note) {
    const { error: noteError } = await supabase
      .from('order_admin_notes')
      .upsert({ order_id: orderId, note, updated_at: new Date().toISOString() });
    if (noteError) throw noteError;
  } else {
    await supabase.from('order_admin_notes').delete().eq('order_id', orderId);
  }

  await logAdminAction(
    note ? 'order_escalated' : 'order_escalation_cleared',
    'order',
    orderId,
    { order_no: data.order_no, reason: note ?? undefined },
    admin.id,
    {
      summary: note ? `주문 에스컬레이션 마킹: ${note}` : '주문 에스컬레이션 해제',
    }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
