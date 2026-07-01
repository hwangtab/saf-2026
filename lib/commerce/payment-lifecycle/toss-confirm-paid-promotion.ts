import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  markOrderPaidWithOutcome,
  type MarkOrderPaidWarning,
} from '@/lib/commerce/payment-lifecycle/mark-order-paid';
import { handleArtworkTakenAutoRefund } from '@/lib/commerce/refund-cancel/auto-refund-taken';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { notifyEmail } from '@/lib/notify';
import { runAllSettled } from '@/lib/server/after-response';
import type { Database } from '@/types/supabase';

export type TossConfirmPaidPromotionClient = SupabaseClient<Database>;

export type TossConfirmPaidPromotionOrder = {
  id: string;
  order_no: string;
  artwork_id?: string | null;
  total_amount?: number | null;
  buyer_name?: string | null;
  buyer_phone?: string | null;
  buyer_email?: string | null;
  metadata?: unknown;
  order_items?: unknown;
};

export type TossConfirmPaidStatusSyncFailureLog = {
  orderId: string;
  orderNo: string;
  targetStatus: 'paid';
  latestStatus: string | null;
  error: string;
};

export type TossConfirmPaidPromotionResult =
  | { ok: true; status: 'promoted' }
  | { ok: true; status: 'already_promoted' }
  | { ok: true; status: 'contest_lost' }
  | { ok: false; code: 'PAYMENT_RECORD_FAILED'; error: string }
  | {
      ok: false;
      code: 'ORDER_STATUS_SYNC_FAILED';
      statusCode: 500 | 409;
      latestStatus: string | null;
      error: string;
    };

export type PromoteTossConfirmPaidOrderInput = {
  supabase: TossConfirmPaidPromotionClient;
  order: TossConfirmPaidPromotionOrder;
  orderNo: string;
  paymentKey: string;
  tossPayment: TossConfirmResponse;
  provider: PaymentProvider;
  buyerLocale: 'ko' | 'en';
  idempotencyKey: string;
  now: string;
  logOrderStatusSyncFailure: (
    input: TossConfirmPaidStatusSyncFailureLog
  ) => Promise<unknown> | unknown;
};

function scheduleSalesWarning(orderNo: string, warning: MarkOrderPaidWarning) {
  if (warning.code === 'ARTWORK_SALES_FAILED') {
    console.error('[confirm] artwork_sales INSERT 실패:', warning.error);
    after(() =>
      notifyEmail('error', '결제 후 판매 기록 생성 실패', {
        주문번호: orderNo,
        에러: warning.error,
        참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
      })
    );
    return;
  }

  console.error('[confirm] paid order with no order_items:', orderNo);
  after(() =>
    notifyEmail('error', '결제 완료 주문에 품목 없음 — 판매 기록 누락', {
      주문번호: orderNo,
      참고: '결제+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
    })
  );
}

export async function promoteTossConfirmPaidOrder({
  supabase,
  order,
  orderNo,
  paymentKey,
  tossPayment,
  provider,
  buyerLocale,
  idempotencyKey,
  now,
  logOrderStatusSyncFailure,
}: PromoteTossConfirmPaidOrderInput): Promise<TossConfirmPaidPromotionResult> {
  const targetStatus = 'paid' as const;
  const paidOutcome = await markOrderPaidWithOutcome({
    supabase,
    order,
    tossPayment,
    provider,
    now,
    sourceStatuses: ['pending_payment'],
    idempotencyKey,
    errors: [],
    continueOnSalesRecordFailure: true,
    metadataPatch: { payment_method: tossPayment.method ?? null },
  });

  if (paidOutcome.ok) {
    for (const warning of paidOutcome.warnings) {
      scheduleSalesWarning(orderNo, warning);
    }
    return { ok: true, status: 'promoted' };
  }

  if (paidOutcome.code === 'PAYMENT_RECORD_FAILED') {
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', error: paidOutcome.error };
  }

  if (paidOutcome.code === 'ORDER_UPDATE_FAILED' || paidOutcome.code === 'ORDER_STATE_MISMATCH') {
    const { data: latestOrder } = await supabase
      .from('orders')
      .select('id,status')
      .eq('id', order.id)
      .single();
    const latestStatus =
      typeof latestOrder === 'object' && latestOrder && 'status' in latestOrder
        ? String(latestOrder.status)
        : null;

    if (paidOutcome.code === 'ORDER_STATE_MISMATCH' && latestStatus === targetStatus) {
      return { ok: true, status: 'already_promoted' };
    }

    const updateErrMsg =
      paidOutcome.code === 'ORDER_UPDATE_FAILED'
        ? paidOutcome.error
        : 'orders update affected 0 rows';
    console.error('[confirm] order UPDATE failed after Toss approval:', updateErrMsg);

    if (paidOutcome.code === 'ORDER_STATE_MISMATCH') {
      after(async () => {
        try {
          await cancelPayment(
            paymentKey,
            { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
            `auto-refund-${orderNo}`,
            provider
          );
        } catch (err) {
          console.error('[confirm] auto-refund failed:', err);
        }
        await runAllSettled('toss-confirm.cancelled-order-refund.notification', [
          () =>
            notifyEmail('error', '결제 승인 후 주문 취소 감지 — 자동 환불 시도', {
              주문번호: orderNo,
              paymentKey,
              참고: '결제 승인과 주문 취소가 동시에 발생. 자동 환불을 시도했으나 결과를 수동 확인해 주세요.',
            }),
        ]);
      });
    }

    after(() =>
      runAllSettled('tossConfirm.orderStatusSyncFailed.notifications', [
        () =>
          notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
            주문번호: orderNo,
            목표상태: targetStatus,
            현재상태: latestStatus ?? '확인 실패',
            에러: updateErrMsg,
            참고: 'Toss 승인은 확인됐지만 내부 주문 상태 전이에 실패해 성공 알림과 매출 기록을 중단했습니다.',
          }),
        () =>
          logOrderStatusSyncFailure({
            orderId: order.id,
            orderNo,
            targetStatus,
            latestStatus,
            error: updateErrMsg,
          }),
      ])
    );

    return {
      ok: false,
      code: 'ORDER_STATUS_SYNC_FAILED',
      statusCode: paidOutcome.code === 'ORDER_UPDATE_FAILED' ? 500 : 409,
      latestStatus,
      error: updateErrMsg,
    };
  }

  if (paidOutcome.code === 'ARTWORK_TAKEN') {
    await handleArtworkTakenAutoRefund({
      supabase,
      paymentKey,
      orderId: order.id,
      orderNo,
      provider,
      salesLines: paidOutcome.salesLines,
      buyerEmail: order.buyer_email,
      buyerName: order.buyer_name ?? '',
      buyerPhone: order.buyer_phone,
      amount: tossPayment.totalAmount,
      locale: buyerLocale,
      now,
      context: {
        logPrefix: '[confirm]',
        successRunLabel: 'toss-confirm.artwork-taken-refund.successNotifications',
        failureRunLabel: 'toss-confirm.artwork-taken-refund.failureNotifications',
        successAdminTitle: '동시 구매 경합 — 자동 환불 완료',
        failureAdminTitle: '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요',
        successReference: '다른 주문이 unique 작품을 먼저 가져가 자동 환불 완료.',
        failureReference:
          '결제는 캡처됐으나 작품은 타인 선점, 자동 환불 실패. 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
      },
    });
    return { ok: true, status: 'contest_lost' };
  }

  scheduleSalesWarning(orderNo, { code: 'ARTWORK_SALES_FAILED', error: paidOutcome.error });
  return { ok: true, status: 'promoted' };
}
