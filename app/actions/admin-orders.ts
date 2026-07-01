'use server';

import { after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireAdmin, requireAdminClient } from '@/lib/auth/guards';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { logAdminAction } from './activity-log-writer';
import {
  getAdminOrderDetailReadModel,
  getAdminOrdersReadModel,
  type AdminOrderListItem,
  type OrderDetail,
  type OrderFilters,
} from '@/lib/orders/admin-read-model';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { runAllSettled } from '@/lib/server/after-response';
import {
  setDepositAutoCancelPausedMutation,
  setOrderEscalationMutation,
  updateTrackingInfoMutation,
} from '@/lib/orders/admin-mutations';
import { cancelAwaitingOrderMutation } from '@/lib/orders/admin-awaiting-cancel';
import { confirmDepositMutation } from '@/lib/orders/deposit-confirmation';
import { refundOrderMutation } from '@/lib/orders/admin-refund';
import { updateOrderStatusMutation } from '@/lib/orders/status-transition';
import type { OrderStatus } from '@/lib/integrations/toss/types';

export type {
  AdminOrderListItem,
  OrderDetail,
  OrderFilters,
  OrderLineItem,
} from '@/lib/orders/admin-read-model';

export async function getOrders(filters: OrderFilters = {}): Promise<AdminOrderListItem[]> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  return getAdminOrdersReadModel(supabase, filters);
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  await requireAdmin();
  const supabase = await requireAdminClient();
  return getAdminOrderDetailReadModel(supabase, orderId);
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
  const trimmedReason = cancelReason.trim();

  if (!trimmedReason) throw new Error('취소 사유를 입력해 주세요.');

  const refundResult = await refundOrderMutation(supabase, {
    orderId,
    cancelReason: trimmedReason,
    refundReceiveAccount,
    now: new Date().toISOString(),
  });

  if (!refundResult.success) {
    const { order, payment, hasTossPayment, syncError, code } = refundResult.syncFailure;
    if (code === 'ORDER_UPDATE_FAILED') {
      console.error('[refundOrder] order status UPDATE failed:', syncError);
    }
    after(() =>
      runAllSettled('adminOrders.refundOrder.orderSyncFailed.notifications', [
        () =>
          notifyEmail('error', 'Toss 취소 후 주문 상태 반영 실패', {
            주문번호: order.order_no,
            주문ID: order.id,
            paymentKey: payment?.payment_key ?? '',
            환불사유: trimmedReason,
            에러: syncError,
            참고: hasTossPayment
              ? 'Toss 취소는 성공했지만 내부 주문 상태가 refunded로 바뀌지 않았습니다.'
              : '환불 처리 중 내부 주문 상태가 refunded로 바뀌지 않았습니다.',
          }),
        () =>
          logAdminAction('order_refund_sync_failed', 'order', order.id, {
            order_no: order.order_no,
            payment_key: payment?.payment_key ?? null,
            reason: trimmedReason,
            error: syncError,
            has_toss_payment: hasTossPayment,
          }),
      ])
    );
    return { success: false, error: 'ORDER_REFUND_SYNC_FAILED' };
  }

  const { order, payment, hasTossPayment, warnings } = refundResult;

  for (const warning of warnings) {
    if (warning.code === 'PAYMENT_UPDATE_FAILED') {
      console.error('[refundOrder] payment status UPDATE failed:', warning.error);
    }
    if (warning.code === 'ARTWORK_SALES_VOID_FAILED') {
      // 환불은 이미 완료(Toss 취소 + 주문 refunded). 판매기록 void 실패 시 매출이 과대 계상되므로 경보.
      console.error('[refundOrder] artwork_sales void failed:', warning.error);
      after(() =>
        notifyEmail('error', '환불 후 판매기록 void 실패 — 수동 처리 필요', {
          주문번호: order.order_no,
          주문ID: orderId,
          에러: warning.error,
        })
      );
    }
    if (warning.code === 'RESERVATION_RELEASE_FAILED') {
      console.error('[refundOrder] reserved artwork release failed:', warning.errors);
    }
  }

  // 3. 관리자 + 구매자 환불 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
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
                    환불사유: trimmedReason,
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

  // 4. Log action
  await logAdminAction(
    'order_refunded',
    'order',
    orderId,
    {
      order_no: order.order_no,
      reason: trimmedReason,
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

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}

export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  trackingInfo?: { carrier: string; trackingNumber: string }
) {
  const admin = await requireAdmin();
  const supabase = await requireAdminClient();

  const { order, fromStatus, toStatus, artworkIds, warnings } = await updateOrderStatusMutation(
    supabase,
    {
      orderId,
      newStatus,
      trackingInfo,
      now: new Date().toISOString(),
    }
  );

  for (const warning of warnings) {
    if (warning.code === 'ARTWORK_SALES_VOID_FAILED') {
      console.error('[updateOrderStatus] artwork_sales void 실패:', warning.error);
    }
    if (warning.code === 'RESERVATION_RELEASE_FAILED') {
      console.error(
        fromStatus === 'awaiting_deposit'
          ? '[updateOrderStatus] awaiting cancel reserved artwork release failed:'
          : '[updateOrderStatus] reserved artwork release failed:',
        warning.errors
      );
    }
  }

  if (newStatus === 'cancelled' && artworkIds.length > 0) {
    for (const artworkId of artworkIds) {
      revalidatePath(`/artworks/${artworkId}`);
      revalidatePath(`/en/artworks/${artworkId}`);
    }
    revalidatePublicArtworkSurfaces();
  }

  await logAdminAction(
    'order_status_updated',
    'order',
    orderId,
    { order_no: order.order_no, from_status: fromStatus, to_status: toStatus, ...trackingInfo },
    admin.id,
    { summary: `주문 상태 변경: ${order.order_no} (${fromStatus} → ${toStatus})` }
  );

  // 구매자 환불 알림 — refund_requested → refunded 전환 시 (updateOrderStatus 경로)
  // refundOrder 액션은 자체 알림 블록을 가지며 이 경로와 독립적.
  if (order.buyer_email && newStatus === 'refunded') {
    after(async () => {
      try {
        const refundInfo = await getOrderNotificationInfo(supabase, { id: order.id });
        const locale = extractBuyerLocale(order.metadata);
        await runAllSettled('adminOrders.updateOrderStatus.refundedNotifications', [
          () =>
            sendBuyerEmail(
              order.buyer_email!,
              'refunded',
              {
                orderNo: order.order_no,
                buyerName: order.buyer_name ?? '',
                artworkTitle: refundInfo?.artworkTitle ?? '',
                artistName: refundInfo?.artistName ?? '',
                amount: refundInfo?.itemAmount ?? 0,
                itemAmount: refundInfo?.itemAmount,
                shippingAmount: refundInfo?.shippingAmount,
              },
              locale
            ),
          () =>
            sendBuyerSms(
              order.buyer_phone,
              'refunded',
              {
                buyerName: order.buyer_name ?? '',
                artworkTitle: refundInfo?.artworkTitle ?? '',
                amount: refundInfo?.itemAmount ?? 0,
              },
              locale,
              order.order_no ?? undefined
            ),
        ]);
      } catch (err) {
        console.error('[updateOrderStatus] refunded notification failed:', err);
      }
    });
  }

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
  const { order } = await updateTrackingInfoMutation(supabase, {
    orderId,
    carrier,
    trackingNumber,
    now: new Date().toISOString(),
  });

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

  const { order, artworkIds } = await confirmDepositMutation(supabase, {
    orderId,
    now: new Date().toISOString(),
  });

  // 관리자 + 구매자 입금 확인 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
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
  const { order } = await setDepositAutoCancelPausedMutation(supabase, {
    orderId,
    paused,
    now: new Date().toISOString(),
  });

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
  const trimmedReason = cancelReason.trim();

  if (!trimmedReason) throw new Error('취소 사유를 입력해 주세요.');

  const { order, warnings } = await cancelAwaitingOrderMutation(supabase, {
    orderId,
    now: new Date().toISOString(),
  });

  for (const warning of warnings) {
    if (warning.code === 'RESERVATION_RELEASE_FAILED') {
      console.error('[cancelAwaitingOrder] artwork restore failed:', warning.errors);
      for (const releaseError of warning.errors ?? []) {
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
  }

  // 2. 관리자 + 구매자 취소 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
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
                  buildAdminNotificationFields(info, { 취소사유: trimmedReason })
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

  // 3. 로그
  await logAdminAction(
    'order_awaiting_cancelled',
    'order',
    orderId,
    {
      order_no: order.order_no,
      reason: trimmedReason,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
    },
    admin.id,
    {
      summary: `입금대기 주문 취소: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, 사유: ${trimmedReason})`,
    }
  );

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
  const { orderNo } = await setOrderEscalationMutation(supabase, {
    orderId,
    note,
    expectedEscalatedAt,
    now: new Date().toISOString(),
  });

  await logAdminAction(
    note ? 'order_escalated' : 'order_escalation_cleared',
    'order',
    orderId,
    { order_no: orderNo, reason: note ?? undefined },
    admin.id,
    {
      summary: note ? `주문 에스컬레이션 마킹: ${note}` : '주문 에스컬레이션 해제',
    }
  );

  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);

  return { success: true };
}
