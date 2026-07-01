import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { markOrderPaidWithOutcome } from '@/lib/commerce/payment-lifecycle/mark-order-paid';
import { handleArtworkTakenAutoRefund } from '@/lib/commerce/refund-cancel/auto-refund-taken';
import { handleCancelledOrderDoneRefund } from '@/lib/commerce/refund-cancel/cancelled-order-done';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import { runAllSettled } from '@/lib/server/after-response';
import { getOrderNotificationInfo } from '@/lib/utils/get-order-notification-info';
import type { Database } from '@/types/supabase';

export type StatusChangedDonePromotionClient = SupabaseClient<Database>;

type StatusChangedDoneOrder = {
  status: string | null;
  artwork_id?: string | null;
  order_no?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  total_amount?: number | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type HandleStatusChangedDonePromotionResult =
  | {
      ok: true;
      status:
        | 'promoted'
        | 'skipped'
        | 'not_promoted'
        | 'contest_lost'
        | 'cancelled_order_done_refund_scheduled';
    }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; orderNo: string | null; error: string };

export async function handleStatusChangedDonePromotion({
  supabase,
  paymentOrderId,
  paymentId,
  paymentKey,
  newStatus,
  verifiedPayment,
  provider,
  now,
}: {
  supabase: StatusChangedDonePromotionClient;
  paymentOrderId: string;
  paymentId: string;
  paymentKey: string;
  newStatus: string;
  verifiedPayment: TossConfirmResponse;
  provider: PaymentProvider;
  now: string;
}): Promise<HandleStatusChangedDonePromotionResult> {
  const { data: existingOrder } = await supabase
    .from('orders')
    .select(
      'status, artwork_id, order_no, buyer_email, buyer_name, buyer_phone, total_amount, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', paymentOrderId)
    .single();

  if (!existingOrder) {
    return { ok: true, status: 'skipped' };
  }

  const order = existingOrder as StatusChangedDoneOrder;
  if (order.status === 'cancelled') {
    handleCancelledOrderDoneRefund({
      supabase,
      paymentKey,
      paymentId,
      orderNo: order.order_no ?? '',
      provider,
    });
    return { ok: true, status: 'cancelled_order_done_refund_scheduled' };
  }

  if (order.status === 'paid' || order.status === 'refunded') {
    return { ok: true, status: 'skipped' };
  }

  const paidOutcome = await markOrderPaidWithOutcome({
    supabase,
    order: { ...order, id: paymentOrderId, order_no: order.order_no ?? verifiedPayment.orderId },
    tossPayment: verifiedPayment,
    provider,
    now,
    sourceStatuses: ['pending_payment', 'awaiting_deposit'],
    idempotencyKey: `webhook-status-${paymentKey}`,
    errors: [],
    continueOnSalesRecordFailure: true,
    metadataPatch: { payment_method: verifiedPayment.method ?? null, webhook_repaired: true },
  });

  if (paidOutcome.ok) {
    for (const warning of paidOutcome.warnings) {
      if (warning.code === 'ARTWORK_SALES_FAILED') {
        console.error(
          `[toss-webhook] STATUS_CHANGED DONE artwork_sales INSERT failed (error): ${order.order_no}`,
          warning.error
        );
        after(() =>
          notifyEmail('error', '웹훅 판매 기록 생성 실패 (STATUS_CHANGED)', {
            주문번호: order.order_no ?? '',
            paymentKey,
            에러: warning.error,
          })
        );
      } else if (warning.code === 'NO_LINE_ITEMS') {
        console.error(
          `[toss-webhook] STATUS_CHANGED DONE paid order with no line items: ${order.order_no}`
        );
        after(() =>
          notifyEmail('error', '웹훅 판매 기록 생성 실패 (STATUS_CHANGED)', {
            주문번호: order.order_no ?? '',
            paymentKey,
            에러: 'order_items 없음',
          })
        );
      }
    }

    await scheduleStatusChangedDoneNotifications({
      supabase,
      paymentOrderId,
      order,
      paymentKey,
      newStatus,
    });
    return { ok: true, status: 'promoted' };
  }

  if (paidOutcome.code === 'PAYMENT_RECORD_FAILED') {
    return {
      ok: false,
      code: 'PAYMENT_RECORD_FAILED',
      orderNo: order.order_no ?? null,
      error: paidOutcome.error,
    };
  }

  if (paidOutcome.code === 'ORDER_UPDATE_FAILED') {
    console.error(
      `[toss-webhook] STATUS_CHANGED DONE order UPDATE failed: ${order.order_no}`,
      paidOutcome.error
    );
    return { ok: true, status: 'not_promoted' };
  }

  if (paidOutcome.code === 'ORDER_STATE_MISMATCH') {
    console.error(`[toss-webhook] STATUS_CHANGED DONE order state mismatch: ${order.order_no}`);
    return { ok: true, status: 'not_promoted' };
  }

  if (paidOutcome.code === 'ARTWORK_TAKEN') {
    await handleArtworkTakenAutoRefund({
      supabase,
      paymentKey,
      orderId: paymentOrderId,
      orderNo: order.order_no ?? '',
      provider,
      salesLines: paidOutcome.salesLines,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name ?? '',
      buyerPhone: order.buyer_phone,
      amount: order.total_amount ?? 0,
      locale: extractBuyerLocale(order.metadata),
      now,
      context: {
        logPrefix: '[toss-webhook] STATUS_CHANGED',
        successRunLabel: 'toss-webhook.statusChanged.autoRefund.successNotifications',
        failureRunLabel: 'toss-webhook.statusChanged.autoRefund.failureNotifications',
        successAdminTitle: '동시 구매 경합 — 자동 환불 완료',
        failureAdminTitle: '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요',
        successReference: '다른 주문이 unique 작품을 먼저 가져가 자동 환불 완료.',
        failureReference:
          '결제는 캡처됐으나 작품은 타인 선점, 자동 환불 실패(가상계좌면 환불 계좌 필요 가능성). 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
      },
    });
    return { ok: true, status: 'contest_lost' };
  }

  console.error(
    `[toss-webhook] STATUS_CHANGED DONE artwork_sales INSERT failed (error): ${order.order_no}`,
    paidOutcome.error
  );
  after(() =>
    notifyEmail('error', '웹훅 판매 기록 생성 실패 (STATUS_CHANGED)', {
      주문번호: order.order_no ?? '',
      paymentKey,
      에러: paidOutcome.error,
    })
  );
  return { ok: true, status: 'not_promoted' };
}

async function scheduleStatusChangedDoneNotifications({
  supabase,
  paymentOrderId,
  order,
  paymentKey,
  newStatus,
}: {
  supabase: StatusChangedDonePromotionClient;
  paymentOrderId: string;
  order: StatusChangedDoneOrder;
  paymentKey: string;
  newStatus: string;
}) {
  const paidInfo = await getOrderNotificationInfo(supabase, { id: paymentOrderId });
  const buyerLocale = extractBuyerLocale(order.metadata);
  const buyerEmail = order.buyer_email;

  after(async () => {
    await runAllSettled('tossWebhook.statusChangedDone.notifications', [
      () =>
        notifyEmail('warning', '결제 webhook 보정 — confirm route 실패 추정', {
          주문번호: order.order_no ?? '',
          paymentKey,
          상태: newStatus,
          참고: 'confirm route 실패로 추정 — payment 기록은 있으나 order/artwork_sales 미반영 상태에서 webhook이 복구',
        }),
      ...(buyerEmail
        ? [
            () =>
              sendBuyerEmail(
                buyerEmail,
                'payment_confirmed',
                {
                  orderNo: order.order_no ?? '',
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: paidInfo?.artworkTitle ?? '',
                  artistName: paidInfo?.artistName ?? '',
                  amount: order.total_amount ?? 0,
                  itemAmount: paidInfo?.itemAmount,
                  shippingAmount: paidInfo?.shippingAmount,
                },
                buyerLocale
              ),
          ]
        : []),
      () =>
        sendBuyerSms(
          order.buyer_phone,
          'payment_confirmed',
          {
            buyerName: order.buyer_name ?? '',
            artworkTitle: paidInfo?.artworkTitle ?? '',
            amount: order.total_amount ?? 0,
          },
          buyerLocale,
          order.order_no ?? undefined
        ),
    ]);
  });
}
