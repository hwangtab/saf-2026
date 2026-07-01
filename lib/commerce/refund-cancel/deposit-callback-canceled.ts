import { after } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';

import {
  cancelAwaitingDepositOrder,
  type CancelAwaitingDepositOrder,
} from '@/lib/commerce/refund-cancel/cancel-awaiting-order';
import { notifyEmail } from '@/lib/notify';
import type { Database } from '@/types/supabase';

export type DepositCallbackCanceledClient = SupabaseClient<Database>;

export type HandleDepositCallbackCanceledResult = {
  ok: true;
  status: 'cancelled' | 'skipped_no_payment' | 'order_missing' | 'not_cancelled';
};

export async function handleDepositCallbackCanceled({
  supabase,
  paymentOrderId,
  paymentKey,
  webhookOrderId,
  now,
}: {
  supabase: DepositCallbackCanceledClient;
  paymentOrderId: string | null;
  paymentKey: string;
  webhookOrderId: string;
  now: string;
}): Promise<HandleDepositCallbackCanceledResult> {
  let status: HandleDepositCallbackCanceledResult['status'] = 'skipped_no_payment';

  if (paymentOrderId) {
    const { data: order } = await supabase
      .from('orders')
      .select('id, order_no, artwork_id, order_items(artwork_id, quantity, unit_price)')
      .eq('id', paymentOrderId)
      .single();

    if (!order) {
      status = 'order_missing';
    } else {
      const cancelOutcome = await cancelAwaitingDepositOrder({
        supabase,
        order: order as CancelAwaitingDepositOrder,
        now,
      });

      if (cancelOutcome.ok) {
        status = 'cancelled';
        for (const warning of cancelOutcome.warnings) {
          if (warning.code === 'RESERVATION_RELEASE_FAILED') {
            console.error('[toss-webhook] artwork reserved→available failed:', warning.errors);
          }
        }
      } else {
        status = 'not_cancelled';
        if (cancelOutcome.code === 'ORDER_UPDATE_FAILED') {
          console.error(
            '[toss-webhook] DEPOSIT_CALLBACK CANCELED order update failed:',
            cancelOutcome.error
          );
        } else {
          console.error('[toss-webhook] DEPOSIT_CALLBACK CANCELED order state mismatch');
        }
      }
    }
  }

  after(() =>
    notifyEmail('warning', '가상계좌 입금 취소/만료', {
      paymentKey,
      주문ID: webhookOrderId,
    })
  );

  return { ok: true, status };
}
