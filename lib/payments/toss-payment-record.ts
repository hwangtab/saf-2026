import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database, Json } from '@/types/supabase';
import type { TossConfirmResponse } from '@/lib/integrations/toss/types';
import { sanitizeConfirmResponse, sanitizeMethodDetail } from '@/lib/integrations/toss/sanitize';

type PaymentsInsert = Database['public']['Tables']['payments']['Insert'];

type EnsureTossPaymentRecordInput = {
  supabase: Pick<SupabaseClient<Database>, 'from'>;
  orderId: string;
  tossPayment: TossConfirmResponse;
  idempotencyKey: string;
  methodDetail?: Json | null;
};

export type EnsureTossPaymentRecordResult =
  | { ok: true; paymentId: string | null; created: boolean }
  | { ok: false; error: string };

function errorMessage(error: unknown): string {
  if (!error) return 'Unknown payment record error';
  if (typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.length > 0) return message;
  }
  return String(error);
}

export async function ensureTossPaymentRecord({
  supabase,
  orderId,
  tossPayment,
  idempotencyKey,
  methodDetail,
}: EnsureTossPaymentRecordInput): Promise<EnsureTossPaymentRecordResult> {
  const { data: existingPayment, error: findError } = await supabase
    .from('payments')
    .select('id')
    .eq('payment_key', tossPayment.paymentKey)
    .maybeSingle();

  if (findError) return { ok: false, error: errorMessage(findError) };
  if (existingPayment) {
    return { ok: true, paymentId: existingPayment.id ?? null, created: false };
  }

  const insertPayload: PaymentsInsert = {
    order_id: orderId,
    payment_key: tossPayment.paymentKey,
    toss_order_id: tossPayment.orderId,
    method: tossPayment.method ?? null,
    method_detail: methodDetail ?? (sanitizeMethodDetail(tossPayment) as Json),
    amount: tossPayment.totalAmount,
    currency: tossPayment.currency ?? 'KRW',
    status: tossPayment.status,
    approved_at: tossPayment.approvedAt ?? null,
    confirm_response: sanitizeConfirmResponse(tossPayment) as Json,
    idempotency_key: idempotencyKey,
  };

  const { data: insertedPayment, error: insertError } = await supabase
    .from('payments')
    .insert(insertPayload)
    .select('id')
    .maybeSingle();

  if (insertError) return { ok: false, error: errorMessage(insertError) };
  return { ok: true, paymentId: insertedPayment?.id ?? null, created: true };
}
