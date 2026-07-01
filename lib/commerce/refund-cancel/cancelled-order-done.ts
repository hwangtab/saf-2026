import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import { cancelPayment } from '@/lib/integrations/toss/cancel';
import type { PaymentProvider } from '@/lib/integrations/toss/config';
import { notifyEmail } from '@/lib/notify';
import { runAllSettled } from '@/lib/server/after-response';
import type { Database } from '@/types/supabase';

export type CancelledOrderDoneRefundClient = SupabaseClient<Database>;

export type HandleCancelledOrderDoneRefundInput = {
  supabase: CancelledOrderDoneRefundClient;
  paymentKey: string;
  paymentId: string;
  orderNo?: string | null;
  provider: PaymentProvider;
  now?: string;
};

export function handleCancelledOrderDoneRefund({
  supabase,
  paymentKey,
  paymentId,
  orderNo,
  provider,
  now,
}: HandleCancelledOrderDoneRefundInput): void {
  after(async () => {
    const cancelledAt = now ?? new Date().toISOString();
    let cancelOk = false;
    let cancelError: unknown = null;

    try {
      const result = await cancelPayment(
        paymentKey,
        { cancelReason: '이미 취소된 주문에 결제 완료 웹훅 수신 — 자동 취소' },
        `auto-refund-cancelled-${orderNo || paymentKey}`,
        provider
      );
      cancelOk = result.success;
      if (!result.success) cancelError = result.error;
    } catch (err) {
      cancelError = err;
    }

    if (cancelOk) {
      const { error: paymentSyncError } = await supabase
        .from('payments')
        .update({ status: 'CANCELED', cancelled_at: cancelledAt })
        .eq('id', paymentId);
      if (paymentSyncError) {
        console.error('[toss-webhook] cancelled-order DONE payment sync failed:', paymentSyncError);
      }
    }

    await runAllSettled('toss-webhook.cancelled-order-done-refund.notification', [
      () =>
        notifyEmail(cancelOk ? 'warning' : 'error', '취소 주문에 결제 완료 웹훅 수신', {
          주문번호: orderNo ?? '',
          paymentKey,
          Toss취소: cancelOk ? '성공' : '실패',
          ...(cancelError ? { 에러: JSON.stringify(cancelError).slice(0, 500) } : {}),
          참고: cancelOk
            ? '이미 취소된 주문에 결제 완료 웹훅이 도착해 자동 취소 처리했습니다.'
            : '이미 취소된 주문에 결제 완료 웹훅이 도착했지만 Toss 취소가 실패했습니다. 수동 확인이 필요합니다.',
        }),
    ]);
  });
}
