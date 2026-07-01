import type { SupabaseClient } from '@supabase/supabase-js';

import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import type { Database, Json } from '@/types/supabase';

export type StatusChangedMissingPaymentClient = Pick<SupabaseClient<Database>, 'from'>;

export type StatusChangedPaymentRow = {
  id: string;
  order_id: string;
  status: string;
  webhook_responses: Json[] | null;
};

export type RepairStatusChangedMissingPaymentResult =
  | { ok: true; paymentRow: StatusChangedPaymentRow }
  | {
      ok: false;
      code: 'ORDER_FETCH_FAILED' | 'PAYMENT_RECORD_FAILED' | 'PAYMENT_REFETCH_FAILED';
      error: unknown;
    };

export async function repairStatusChangedMissingPaymentRecord({
  supabase,
  paymentKey,
  verifiedPayment,
}: {
  supabase: StatusChangedMissingPaymentClient;
  paymentKey: string;
  verifiedPayment: TossConfirmResponse;
}): Promise<RepairStatusChangedMissingPaymentResult> {
  const { data: orderForMissingPayment, error: orderForMissingPaymentError } = await supabase
    .from('orders')
    .select('id')
    .eq('order_no', verifiedPayment.orderId)
    .maybeSingle();

  if (orderForMissingPaymentError || !orderForMissingPayment) {
    return {
      ok: false,
      code: 'ORDER_FETCH_FAILED',
      error: orderForMissingPaymentError ?? { message: 'Order not found' },
    };
  }

  const paymentRecordResult = await ensureTossPaymentRecord({
    supabase,
    orderId: orderForMissingPayment.id,
    tossPayment: verifiedPayment,
    idempotencyKey: `webhook-status-${paymentKey}`,
  });

  if (!paymentRecordResult.ok) {
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', error: paymentRecordResult.error };
  }

  if (paymentRecordResult.paymentId) {
    return {
      ok: true,
      paymentRow: {
        id: paymentRecordResult.paymentId,
        order_id: orderForMissingPayment.id,
        status: verifiedPayment.status,
        webhook_responses: [],
      },
    };
  }

  const { data: refetchedPayment, error: refetchPaymentError } = await supabase
    .from('payments')
    .select('id, order_id, status, webhook_responses')
    .eq('payment_key', paymentKey)
    .maybeSingle();

  if (refetchPaymentError || !refetchedPayment) {
    return {
      ok: false,
      code: 'PAYMENT_REFETCH_FAILED',
      error: refetchPaymentError ?? { message: 'Payment row not found' },
    };
  }

  return { ok: true, paymentRow: refetchedPayment as StatusChangedPaymentRow };
}
