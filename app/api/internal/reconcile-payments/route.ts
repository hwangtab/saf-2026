import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import { fetchPaymentByOrderId } from '@/lib/integrations/toss/confirm';
import { notifyEmail } from '@/lib/notify';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

export const runtime = 'nodejs';

/**
 * Reconciliation cron: 결제-주문 불일치 자동 보정.
 *
 * 시나리오: Toss confirm API는 성공했지만 이후 DB 작업(payment INSERT, order UPDATE,
 * artwork_sales INSERT) 중 하나가 실패하면 → 고객은 결제했는데 주문이 pending_payment로
 * 남아 30분 후 자동 취소되는 문제.
 *
 * 동작:
 * 1) pending_payment 상태 + 5분 이상 경과한 주문을 찾음
 * 2) Toss API에서 orderId(=order_no)로 결제 상태 조회
 * 3) DONE → payment 레코드 보정, 주문 paid 전환, artwork_sales 생성
 * 4) WAITING_FOR_DEPOSIT → 주문 awaiting_deposit 전환
 *
 * 매 10분 Vercel Cron 실행 (expire-stale-orders 직후).
 */
export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET is not configured.' }, { status: 500 });
  }

  const authHeader = request.headers.get('authorization') ?? '';
  const expected = `Bearer ${cronSecret}`;
  const a = Buffer.from(authHeader);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !adminKey) {
    return NextResponse.json({ error: 'Supabase admin credentials are missing.' }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${adminKey}` } },
  });

  // 5분~28분 경과한 pending_payment 주문 (5분 미만은 정상 결제 진행 중일 수 있고,
  // 30분 이상은 expire-stale-orders 크론이 이미 취소함 — 2분 안전 마진)
  const minAge = new Date(Date.now() - 28 * 60 * 1000).toISOString();
  const maxAge = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: staleOrders, error: fetchError } = await supabase
    .from('orders')
    .select('id, order_no, artwork_id, total_amount, buyer_name, buyer_phone, metadata')
    .eq('status', 'pending_payment')
    .gt('created_at', minAge)
    .lt('created_at', maxAge);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!staleOrders || staleOrders.length === 0) {
    return NextResponse.json({ reconciled: 0, checked: 0 });
  }

  let reconciled = 0;
  const errors: string[] = [];

  for (const order of staleOrders) {
    try {
      // Toss API에서 결제 상태 확인
      const tossPayment = await fetchPaymentByOrderId(order.order_no);

      if (!tossPayment) continue; // Toss에 결제 기록 없음 → 미결제, 스킵

      const now = new Date().toISOString();
      const existingMetadata = (order.metadata as Record<string, unknown>) ?? {};

      if (tossPayment.status === 'DONE') {
        // ── 결제 완료인데 DB에 반영 안 된 케이스 → 보정 ──

        // 1) payment 레코드가 없으면 생성
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('payment_key', tossPayment.paymentKey)
          .maybeSingle();

        if (!existingPayment) {
          const { error: paymentInsertError } = await supabase.from('payments').insert({
            order_id: order.id,
            payment_key: tossPayment.paymentKey,
            toss_order_id: tossPayment.orderId,
            method: tossPayment.method ?? null,
            method_detail: tossPayment.card ?? tossPayment.virtualAccount ?? null,
            amount: tossPayment.totalAmount,
            currency: tossPayment.currency ?? 'KRW',
            status: tossPayment.status,
            approved_at: tossPayment.approvedAt ?? null,
            confirm_response: tossPayment as Record<string, unknown>,
            idempotency_key: `reconcile-${order.order_no}`,
          });

          if (paymentInsertError) {
            errors.push(`${order.order_no}: payment insert failed: ${paymentInsertError.message}`);
            continue;
          }
        }

        // 2) 주문 → paid (멱등성: pending_payment일 때만)
        // SELECT로 업데이트된 행 수를 확인 — 0행이면 이미 cancelled 등으로 상태 변경됨
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'paid',
            paid_at: tossPayment.approvedAt ?? now,
            // 기존 metadata 보존 후 병합
            metadata: {
              ...existingMetadata,
              payment_method: tossPayment.method ?? null,
              reconciled: true,
            },
          })
          .eq('id', order.id)
          .eq('status', 'pending_payment')
          .select('id');

        if (orderUpdateError) {
          errors.push(`${order.order_no}: order update failed: ${orderUpdateError.message}`);
          continue;
        }

        // 주문 상태 전환에 실패한 경우 (이미 cancelled 등) → artwork_sales 생성 스킵
        if (!updatedOrders || updatedOrders.length === 0) {
          console.error(
            `[reconcile-payments] SKIP: ${order.order_no} — order no longer pending_payment, skipping artwork_sales`
          );
          continue;
        }

        // 3) artwork_sales 레코드가 없으면 생성 (중복 방지)
        if (order.artwork_id) {
          const { data: existingSale } = await supabase
            .from('artwork_sales')
            .select('id')
            .eq('order_id', order.id)
            .is('voided_at', null)
            .maybeSingle();

          if (!existingSale) {
            const { error: saleInsertError } = await supabase.from('artwork_sales').insert({
              artwork_id: order.artwork_id,
              sale_price: order.total_amount,
              quantity: 1,
              source: 'toss',
              source_detail: 'toss_api',
              order_id: order.id,
              external_order_id: order.order_no,
              buyer_name: order.buyer_name,
              buyer_phone: order.buyer_phone,
              sold_at: tossPayment.approvedAt ?? now,
            });

            if (saleInsertError) {
              errors.push(
                `${order.order_no}: artwork_sales insert failed: ${saleInsertError.message}`
              );
              continue;
            }
          }

          // artwork_sales 반영 후 작품 상태 동기화 + 공개 페이지 캐시 무효화
          const adminClient = createSupabaseAdminClient();
          await deriveAndSyncArtworkStatus(adminClient, order.artwork_id);
          revalidatePublicArtworkSurfaces();
          revalidatePath(`/artworks/${order.artwork_id}`);
          revalidatePath(`/en/artworks/${order.artwork_id}`);
        }

        reconciled++;
        console.error(
          `[reconcile-payments] FIXED: ${order.order_no} — Toss DONE, DB was pending_payment`
        );
      } else if (tossPayment.status === 'WAITING_FOR_DEPOSIT') {
        // ── 가상계좌 입금 대기인데 DB에 반영 안 된 케이스 ──

        // payment 레코드 보정
        const { data: existingPayment } = await supabase
          .from('payments')
          .select('id')
          .eq('payment_key', tossPayment.paymentKey)
          .maybeSingle();

        if (!existingPayment) {
          const { error: paymentInsertError } = await supabase.from('payments').insert({
            order_id: order.id,
            payment_key: tossPayment.paymentKey,
            toss_order_id: tossPayment.orderId,
            method: tossPayment.method ?? null,
            method_detail: tossPayment.virtualAccount ?? null,
            amount: tossPayment.totalAmount,
            currency: tossPayment.currency ?? 'KRW',
            status: tossPayment.status,
            confirm_response: tossPayment as Record<string, unknown>,
            idempotency_key: `reconcile-${order.order_no}`,
          });

          if (paymentInsertError) {
            errors.push(`${order.order_no}: payment insert failed: ${paymentInsertError.message}`);
            continue;
          }
        }

        // 주문 → awaiting_deposit
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({
            status: 'awaiting_deposit',
            metadata: {
              ...existingMetadata,
              payment_method: tossPayment.method ?? null,
              reconciled: true,
            },
          })
          .eq('id', order.id)
          .eq('status', 'pending_payment')
          .select('id');

        if (orderUpdateError) {
          errors.push(`${order.order_no}: order update failed: ${orderUpdateError.message}`);
          continue;
        }

        if (!updatedOrders || updatedOrders.length === 0) {
          console.error(
            `[reconcile-payments] SKIP: ${order.order_no} — order no longer pending_payment`
          );
          continue;
        }

        // awaiting_deposit 전환 후 artwork 예약 처리
        if (order.artwork_id) {
          await supabase
            .from('artworks')
            .update({ status: 'reserved' })
            .eq('id', order.artwork_id)
            .eq('status', 'available');
          revalidatePublicArtworkSurfaces();
          revalidatePath(`/artworks/${order.artwork_id}`);
          revalidatePath(`/en/artworks/${order.artwork_id}`);
        }

        reconciled++;
        console.error(
          `[reconcile-payments] FIXED: ${order.order_no} — Toss WAITING_FOR_DEPOSIT, DB was pending_payment`
        );
      }
      // CANCELED, ABORTED, EXPIRED 등은 무시 — expire-stale-orders가 처리
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${order.order_no}: ${msg}`);
      console.error(`[reconcile-payments] ERROR: ${order.order_no}:`, err);
    }
  }

  // 결과 알림
  if (errors.length > 0) {
    await notifyEmail('error', `결제 보정 크론 에러 (${errors.length}건)`, {
      검사: `${staleOrders.length}건`,
      보정: `${reconciled}건`,
      에러: errors.slice(0, 3).join('\n'),
    });
  } else if (reconciled > 0) {
    await notifyEmail('warning', `결제 보정 완료 (${reconciled}건)`, {
      검사: `${staleOrders.length}건`,
      보정: `${reconciled}건`,
    });
  }

  return NextResponse.json({
    checked: staleOrders.length,
    reconciled,
    ...(errors.length > 0 ? { errors } : {}),
  });
}
