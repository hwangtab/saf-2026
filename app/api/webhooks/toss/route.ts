import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import {
  parseWebhookPayload,
  verifyDepositCallbackSecret,
  isDepositCallback,
  isPaymentStatusChanged,
} from '@/lib/integrations/toss/webhook';

const CANCELED_STATUSES = new Set(['CANCELED', 'PARTIAL_CANCELED']);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) {
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (isDepositCallback(payload)) {
    const paymentKey = payload.data.paymentKey;

    // Find payment record by payment_key (also extracts per-payment secret for verification)
    const { data: paymentRecord } = await supabase
      .from('payments')
      .select('id, order_id, webhook_responses, confirm_response')
      .eq('payment_key', paymentKey)
      .single();

    // SEC-04a: Verify per-payment secret from confirm_response.virtualAccount.secret
    // TossPayments secret은 결제 건별 고유값 — 환경변수가 아닌 DB 저장값과 비교
    const storedSecret =
      (
        paymentRecord?.confirm_response as
          | { virtualAccount?: { secret?: string } }
          | null
          | undefined
      )?.virtualAccount?.secret ?? null;

    if (!verifyDepositCallbackSecret(payload, storedSecret)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.data.paymentStatus === 'DONE') {
      // SEC-04b: Double-verify from Toss API
      const verified = await fetchPayment(paymentKey);
      if (!verified || verified.status !== 'DONE') {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (paymentRecord) {
        // 멱등성 가드: 이미 paid 상태이면 중복 처리 방지
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('status')
          .eq('id', paymentRecord.order_id)
          .single();
        if (existingOrder?.status === 'paid') {
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Update payment status
        const existingWebhooks = Array.isArray(paymentRecord.webhook_responses)
          ? paymentRecord.webhook_responses
          : [];
        await supabase
          .from('payments')
          .update({
            status: 'DONE',
            approved_at: new Date().toISOString(),
            webhook_responses: [...existingWebhooks, body],
          })
          .eq('id', paymentRecord.id);

        // Update order status
        await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentRecord.order_id);

        // Fetch order for artwork_id, total_amount, and buyer info
        const { data: order } = await supabase
          .from('orders')
          .select('artwork_id, total_amount, order_no, buyer_name, buyer_phone')
          .eq('id', paymentRecord.order_id)
          .single();

        if (order) {
          // Insert artwork_sales record (trigger will mark artwork as sold)
          await supabase.from('artwork_sales').insert({
            artwork_id: order.artwork_id,
            sale_price: order.total_amount,
            quantity: 1,
            source: 'toss',
            source_detail: 'toss_api',
            order_id: paymentRecord.order_id,
            external_order_id: order.order_no,
            buyer_name: order.buyer_name,
            buyer_phone: order.buyer_phone,
            sold_at: new Date().toISOString(),
          });
        }
      }
    }
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const newStatus = payload.data.status;

    // Update payment status
    const existingWebhooksSC = await supabase
      .from('payments')
      .select('id, order_id, status, webhook_responses')
      .eq('payment_key', paymentKey)
      .single();

    const paymentRow = existingWebhooksSC.data;

    if (paymentRow) {
      const existingWebhooks = Array.isArray(paymentRow.webhook_responses)
        ? paymentRow.webhook_responses
        : [];

      await supabase
        .from('payments')
        .update({ status: newStatus, webhook_responses: [...existingWebhooks, body] })
        .eq('id', paymentRow.id);

      // Cascade cancel to order + artwork_sales when Toss marks payment as canceled
      if (CANCELED_STATUSES.has(newStatus) && paymentRow.order_id) {
        // Idempotency: skip if already refunded/cancelled
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('status, artwork_id')
          .eq('id', paymentRow.order_id)
          .single();

        if (existingOrder && !['refunded', 'cancelled'].includes(existingOrder.status)) {
          // Double-verify from Toss API before modifying DB
          const verified = await fetchPayment(paymentKey);
          if (verified && CANCELED_STATUSES.has(verified.status)) {
            const now = new Date().toISOString();

            await supabase
              .from('orders')
              .update({ status: 'refunded', refunded_at: now })
              .eq('id', paymentRow.order_id)
              .not('status', 'in', '("refunded","cancelled")');

            // Void artwork_sales
            const { data: sale } = await supabase
              .from('artwork_sales')
              .select('id')
              .eq('order_id', paymentRow.order_id)
              .is('voided_at', null)
              .limit(1)
              .single();

            if (sale) {
              await supabase
                .from('artwork_sales')
                .update({ voided_at: now, void_reason: 'Toss 웹훅 취소 자동 처리' })
                .eq('id', sale.id);
            }
          }
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
