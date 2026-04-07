import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { paymentKey, orderId, amount } = body as {
    paymentKey?: unknown;
    orderId?: unknown;
    amount?: unknown;
  };

  if (typeof paymentKey !== 'string' || typeof orderId !== 'string' || typeof amount !== 'number') {
    return NextResponse.json(
      { error: 'paymentKey, orderId, amount are required' },
      { status: 400 }
    );
  }

  const supabase = createSupabaseAdminClient();

  // Find the order by order_no (orderId from Toss = our orderNo)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id, total_amount, status, artwork_id, order_no')
    .eq('order_no', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: '주문을 찾을 수 없습니다.' }, { status: 404 });
  }

  // SEC-01: Amount must match exactly
  if (order.total_amount !== amount) {
    return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
  }

  // Idempotency: already paid
  if (order.status === 'paid') {
    return NextResponse.json({ success: true, alreadyPaid: true });
  }

  // Confirm with Toss
  const idempotencyKey = `confirm-${orderId}`;
  const confirmResult = await confirmPayment({ paymentKey, orderId, amount }, idempotencyKey);

  if (!confirmResult.success) {
    // Mark order as cancelled on failure
    await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id);

    return NextResponse.json(
      { error: confirmResult.error.message || '결제 승인에 실패했습니다.' },
      { status: 400 }
    );
  }

  const tossResponse = confirmResult.data;
  const isVirtualAccount = tossResponse.status === 'WAITING_FOR_DEPOSIT';
  const isDone = tossResponse.status === 'DONE';

  // Insert payment record
  const { data: payment } = await supabase
    .from('payments')
    .insert({
      order_id: order.id,
      payment_key: tossResponse.paymentKey,
      toss_order_id: tossResponse.orderId,
      method: tossResponse.method ?? null,
      method_detail: tossResponse.card ?? tossResponse.virtualAccount ?? null,
      amount: tossResponse.totalAmount,
      currency: tossResponse.currency ?? 'KRW',
      status: tossResponse.status,
      approved_at: tossResponse.approvedAt ?? null,
      confirm_response: tossResponse as Record<string, unknown>,
      idempotency_key: idempotencyKey,
    })
    .select('id')
    .single();

  // Update order status
  await supabase
    .from('orders')
    .update({
      status: isDone ? 'paid' : order.status,
      paid_at: isDone ? new Date().toISOString() : null,
      metadata: { payment_method: tossResponse.method ?? null },
    })
    .eq('id', order.id);

  // If fully paid, insert artwork_sales record
  // (DB trigger update_artwork_status_on_sale will mark artwork as sold)
  if (isDone && payment) {
    await supabase.from('artwork_sales').insert({
      artwork_id: order.artwork_id,
      sale_price: order.total_amount,
      quantity: 1,
      source: 'toss',
      source_detail: 'toss_api',
      order_id: order.id,
      sold_at: new Date().toISOString(),
    });
  }

  return NextResponse.json({
    success: true,
    status: tossResponse.status,
    virtualAccount: isVirtualAccount ? (tossResponse.virtualAccount ?? null) : null,
  });
}
