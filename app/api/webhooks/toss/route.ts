import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import {
  parseWebhookPayload,
  verifyDepositCallbackSecret,
  isDepositCallback,
  isPaymentStatusChanged,
} from '@/lib/integrations/toss/webhook';

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
    // Verify deposit callback secret
    if (!verifyDepositCallbackSecret(payload)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.data.paymentStatus === 'DONE') {
      const paymentKey = payload.data.paymentKey;

      // SEC-04: Double-verify from Toss API
      const verified = await fetchPayment(paymentKey);
      if (!verified || verified.status !== 'DONE') {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      // Find payment record by payment_key
      const { data: paymentRecord } = await supabase
        .from('payments')
        .select('id, order_id, webhook_responses')
        .eq('payment_key', paymentKey)
        .single();

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

    await supabase.from('payments').update({ status: newStatus }).eq('payment_key', paymentKey);
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
