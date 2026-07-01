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
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import type { Database, Json } from '@/types/supabase';

export type DepositCallbackDonePromotionClient = SupabaseClient<Database>;

export type DepositCallbackPaymentRecord = {
  id: string;
  order_id: string;
  webhook_responses: Json[] | null;
};

type DepositCallbackOrder = {
  status: string | null;
  artwork_id?: string | null;
  total_amount?: number | null;
  order_no?: string | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type HandleDepositCallbackDonePromotionResult =
  | {
      ok: true;
      status:
        | 'promoted'
        | 'already_paid'
        | 'contest_lost'
        | 'not_promoted'
        | 'cancelled_order_done_refund_scheduled';
    }
  | { ok: false; code: 'PAYMENT_RECORD_NOT_FOUND' }
  | { ok: false; code: 'ORDER_FETCH_FAILED'; error?: unknown }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string };

export async function handleDepositCallbackDonePromotion({
  supabase,
  paymentRecord,
  paymentKey,
  webhookOrderId,
  verifiedPayment,
  provider,
  webhookBody,
  now,
}: {
  supabase: DepositCallbackDonePromotionClient;
  paymentRecord: DepositCallbackPaymentRecord | null;
  paymentKey: string;
  webhookOrderId: string;
  verifiedPayment: TossConfirmResponse;
  provider: PaymentProvider;
  webhookBody: Json;
  now: string;
}): Promise<HandleDepositCallbackDonePromotionResult> {
  if (!paymentRecord) {
    console.error(`[toss-webhook] DEPOSIT_CALLBACK DONE but no payment record: ${paymentKey}`);
    after(() =>
      notifyEmail('error', '웹훅 수신: 결제 기록 없이 입금 완료', {
        paymentKey,
        주문ID: webhookOrderId,
        참고: 'payments 테이블에 해당 paymentKey 미존재 — reconciliation 또는 수동 확인 필요',
      })
    );
    return { ok: false, code: 'PAYMENT_RECORD_NOT_FOUND' };
  }

  const { data: existingOrder } = await supabase
    .from('orders')
    .select(
      'status, artwork_id, total_amount, order_no, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('id', paymentRecord.order_id)
    .single();

  if (!existingOrder) {
    console.error(`[toss-webhook] DEPOSIT_CALLBACK order fetch failed: ${paymentKey}`);
    return { ok: false, code: 'ORDER_FETCH_FAILED' };
  }

  const order = existingOrder as DepositCallbackOrder;
  if (order.status === 'paid') {
    return { ok: true, status: 'already_paid' };
  }

  if (order.status === 'cancelled') {
    handleCancelledOrderDoneRefund({
      supabase,
      paymentKey,
      paymentId: paymentRecord.id,
      orderNo: order.order_no ?? webhookOrderId,
      provider,
    });
    return { ok: true, status: 'cancelled_order_done_refund_scheduled' };
  }

  const existingWebhooks = Array.isArray(paymentRecord.webhook_responses)
    ? paymentRecord.webhook_responses
    : [];
  const { error: paymentUpdateError } = await supabase
    .from('payments')
    .update({
      status: 'DONE',
      approved_at: now,
      webhook_responses: [...existingWebhooks, webhookBody],
    })
    .eq('id', paymentRecord.id);

  if (paymentUpdateError) {
    console.error(`[toss-webhook] payment UPDATE failed: ${paymentKey}`, paymentUpdateError);
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', error: paymentUpdateError.message };
  }

  const paidOutcome = await markOrderPaidWithOutcome({
    supabase,
    order: {
      id: paymentRecord.order_id,
      order_no: order.order_no ?? webhookOrderId,
      artwork_id: order.artwork_id ?? null,
      total_amount: order.total_amount ?? null,
      buyer_name: order.buyer_name ?? null,
      buyer_phone: order.buyer_phone ?? null,
      metadata: order.metadata,
      order_items: order.order_items,
    },
    tossPayment: verifiedPayment,
    provider,
    now,
    sourceStatuses: ['awaiting_deposit'],
    idempotencyKey: `webhook-deposit-${paymentKey}`,
    errors: [],
    continueOnSalesRecordFailure: true,
    metadataPatch: { payment_method: verifiedPayment.method ?? null, webhook_repaired: true },
  });

  if (paidOutcome.ok) {
    for (const warning of paidOutcome.warnings) {
      if (warning.code === 'ARTWORK_SALES_FAILED') {
        console.error(
          `[toss-webhook] artwork_sales INSERT failed (error): ${order.order_no}`,
          warning.error
        );
        after(() =>
          notifyEmail('error', '웹훅 판매 기록 생성 실패', {
            주문번호: order.order_no ?? '',
            에러: warning.error,
          })
        );
      } else if (warning.code === 'NO_LINE_ITEMS') {
        console.error(`[toss-webhook] paid deposit with no order_items: ${order.order_no}`);
        after(() =>
          notifyEmail('error', '입금 완료 주문에 품목 없음 — 판매 기록 누락', {
            주문번호: order.order_no ?? '',
            참고: '입금+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
          })
        );
      }
    }

    await scheduleDepositPaidNotifications({
      supabase,
      paymentOrderId: paymentRecord.order_id,
      order,
    });
    return { ok: true, status: 'promoted' };
  }

  if (paidOutcome.code === 'PAYMENT_RECORD_FAILED') {
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', error: paidOutcome.error };
  }

  if (paidOutcome.code === 'ORDER_UPDATE_FAILED') {
    console.error(`[toss-webhook] order UPDATE failed: ${order.order_no}`, paidOutcome.error);
    after(() =>
      notifyEmail('error', '웹훅 주문 상태 업데이트 실패', {
        주문번호: order.order_no ?? '',
        paymentKey,
        에러: paidOutcome.error,
      })
    );
    return { ok: true, status: 'not_promoted' };
  }

  if (paidOutcome.code === 'ORDER_STATE_MISMATCH') {
    console.error(`[toss-webhook] DEPOSIT_CALLBACK order state mismatch: ${order.order_no}`);
    return { ok: true, status: 'not_promoted' };
  }

  if (paidOutcome.code === 'ARTWORK_TAKEN') {
    await handleArtworkTakenAutoRefund({
      supabase,
      paymentKey,
      orderId: paymentRecord.order_id,
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
        logPrefix: '[toss-webhook] DEPOSIT_CALLBACK',
        successRunLabel: 'toss-webhook.depositCallback.autoRefund.successNotifications',
        failureRunLabel: 'toss-webhook.depositCallback.autoRefund.failureNotifications',
        successAdminTitle: '동시 구매 경합 — 자동 환불 완료 (가상계좌 입금분)',
        failureAdminTitle:
          '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요 (가상계좌 입금분)',
        successReference: '다른 주문이 unique 작품을 먼저 가져가 입금분 자동 환불 완료.',
        failureReference:
          '가상계좌 입금 완료됐으나 작품은 타인 선점, 자동 환불 실패(환불 계좌 필요 가능성). 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
      },
    });
    return { ok: true, status: 'contest_lost' };
  }

  console.error(
    `[toss-webhook] artwork_sales INSERT failed (error): ${order.order_no}`,
    paidOutcome.error
  );
  after(() =>
    notifyEmail('error', '웹훅 판매 기록 생성 실패', {
      주문번호: order.order_no ?? '',
      에러: paidOutcome.error,
    })
  );
  return { ok: true, status: 'not_promoted' };
}

async function scheduleDepositPaidNotifications({
  supabase,
  paymentOrderId,
  order,
}: {
  supabase: DepositCallbackDonePromotionClient;
  paymentOrderId: string;
  order: DepositCallbackOrder;
}) {
  const depositInfo = await getOrderNotificationInfo(supabase, { id: paymentOrderId });
  const buyerEmail = order.buyer_email;

  after(async () => {
    await runAllSettled('tossWebhook.depositPaid.notifications', [
      () =>
        depositInfo
          ? notifyEmail('payment', '가상계좌 입금 확인', buildAdminNotificationFields(depositInfo))
          : notifyEmail('payment', '가상계좌 입금 확인', {
              주문번호: order.order_no ?? '',
              금액: `₩${(order.total_amount ?? 0).toLocaleString('ko-KR')}`,
            }),
      ...(buyerEmail
        ? [
            () =>
              sendBuyerEmail(
                buyerEmail,
                'deposit_confirmed',
                {
                  orderNo: order.order_no ?? '',
                  buyerName: order.buyer_name ?? '',
                  artworkTitle: depositInfo?.artworkTitle ?? '',
                  artistName: depositInfo?.artistName ?? '',
                  amount: order.total_amount ?? 0,
                  itemAmount: depositInfo?.itemAmount,
                  shippingAmount: depositInfo?.shippingAmount,
                  shipping: depositInfo
                    ? {
                        name: depositInfo.shippingName,
                        phone: depositInfo.shippingPhone,
                        address: depositInfo.shippingAddress,
                        memo: depositInfo.shippingMemo,
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
          {
            buyerName: order.buyer_name ?? '',
            artworkTitle: depositInfo?.artworkTitle ?? '',
            amount: order.total_amount ?? 0,
          },
          extractBuyerLocale(order.metadata),
          order.order_no ?? undefined
        ),
    ]);
  });
}
