import type { SupabaseClient } from '@supabase/supabase-js';

import { fetchPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider, type PaymentProvider } from '@/lib/integrations/toss/config';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import type { Database, Json } from '@/types/supabase';

export type DepositMissingPaymentClient = Pick<SupabaseClient<Database>, 'from'>;

export type DepositPaymentRecord = {
  id: string;
  order_id: string;
  webhook_responses: Json[] | null;
  confirm_response: Json | null;
};

export type RepairDepositCallbackMissingPaymentResult =
  | {
      ok: true;
      provider: PaymentProvider;
      verifiedPayment: TossConfirmResponse;
      paymentRecord: DepositPaymentRecord;
    }
  | {
      ok: false;
      code: 'ORDER_FETCH_FAILED';
      error: unknown;
    }
  | {
      ok: false;
      code: 'VERIFY_FAILED';
      provider: PaymentProvider;
      verifiedPayment: TossConfirmResponse | null;
    }
  | {
      ok: false;
      code: 'PAYMENT_RECORD_FAILED';
      provider: PaymentProvider;
      error: unknown;
    }
  | {
      ok: false;
      code: 'PAYMENT_REFETCH_FAILED';
      provider: PaymentProvider;
      verifiedPayment: TossConfirmResponse;
      error: unknown;
    };

export async function repairDepositCallbackMissingPaymentRecord({
  supabase,
  paymentKey,
  webhookOrderId,
}: {
  supabase: DepositMissingPaymentClient;
  paymentKey: string;
  webhookOrderId: string;
}): Promise<RepairDepositCallbackMissingPaymentResult> {
  const { data: orderForMissingPayment, error: orderForMissingPaymentError } = await supabase
    .from('orders')
    .select('id, metadata')
    .eq('order_no', webhookOrderId)
    .maybeSingle();

  if (orderForMissingPaymentError || !orderForMissingPayment) {
    return {
      ok: false,
      code: 'ORDER_FETCH_FAILED',
      error: orderForMissingPaymentError ?? { message: 'Order not found' },
    };
  }

  const provider = resolveOrderProvider(orderForMissingPayment.metadata);
  const verifiedPayment = await fetchPayment(paymentKey, provider);
  if (
    !verifiedPayment ||
    verifiedPayment.status !== 'DONE' ||
    verifiedPayment.orderId !== webhookOrderId
  ) {
    return { ok: false, code: 'VERIFY_FAILED', provider, verifiedPayment };
  }

  const paymentRecordResult = await ensureTossPaymentRecord({
    supabase,
    orderId: orderForMissingPayment.id,
    tossPayment: verifiedPayment,
    idempotencyKey: `webhook-deposit-${paymentKey}`,
  });

  if (!paymentRecordResult.ok) {
    return { ok: false, code: 'PAYMENT_RECORD_FAILED', provider, error: paymentRecordResult.error };
  }

  if (paymentRecordResult.paymentId) {
    return {
      ok: true,
      provider,
      verifiedPayment,
      paymentRecord: {
        id: paymentRecordResult.paymentId,
        order_id: orderForMissingPayment.id,
        webhook_responses: [],
        confirm_response: verifiedPayment as Json,
      },
    };
  }

  const { data: refetchedPayment, error: refetchPaymentError } = await supabase
    .from('payments')
    .select('id, order_id, webhook_responses, confirm_response')
    .eq('payment_key', paymentKey)
    .maybeSingle();

  if (refetchPaymentError || !refetchedPayment) {
    return {
      ok: false,
      code: 'PAYMENT_REFETCH_FAILED',
      provider,
      verifiedPayment,
      error: refetchPaymentError ?? { message: 'Payment row not found' },
    };
  }

  return {
    ok: true,
    provider,
    verifiedPayment,
    paymentRecord: refetchedPayment as DepositPaymentRecord,
  };
}
