import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import type { Json } from '@/types/supabase';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import {
  parseWebhookPayload,
  verifyWebhookRequest,
  verifyDepositCallbackSecret,
  isDepositCallback,
  isPaymentStatusChanged,
} from '@/lib/integrations/toss/webhook';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { getArtworkEmailInfo } from '@/lib/utils/get-artwork-email-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';

const CANCELED_STATUSES = new Set(['CANCELED', 'PARTIAL_CANCELED']);

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // SEC-04: 웹훅 시크릿 검증 (PAYMENT_STATUS_CHANGED / DEPOSIT_CALLBACK 공통)
  if (!verifyWebhookRequest(req)) {
    console.error('[toss-webhook] Webhook secret verification failed');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = parseWebhookPayload(body);
  if (!payload) {
    console.error('[toss-webhook] Invalid payload received');
    return NextResponse.json({ error: 'Invalid webhook payload' }, { status: 400 });
  }

  const supabase = createSupabaseAdminClient();

  if (isDepositCallback(payload)) {
    const paymentKey = payload.data.paymentKey;

    // Find payment record — distinguish Supabase errors from "not found"
    const { data: paymentRecord, error: paymentLookupError } = await supabase
      .from('payments')
      .select('id, order_id, webhook_responses, confirm_response')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (paymentLookupError) {
      // DB 에러: 인증 실패가 아닌 서버 에러 — Toss가 재시도할 수 있도록 500 반환
      console.error('[toss-webhook] payment lookup failed:', paymentLookupError);
      void notifyEmail('error', '웹훅 DB 조회 실패', {
        paymentKey,
        에러: paymentLookupError.message,
      });
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    // SEC-04a: Verify per-payment secret from confirm_response.virtualAccount.secret
    const storedSecret =
      (
        paymentRecord?.confirm_response as
          | { virtualAccount?: { secret?: string } }
          | null
          | undefined
      )?.virtualAccount?.secret ?? null;

    if (!verifyDepositCallbackSecret(payload, storedSecret)) {
      console.error(`[toss-webhook] DEPOSIT_CALLBACK secret verification failed: ${paymentKey}`);
      void notifyEmail('error', '웹훅 검증 실패 (DEPOSIT_CALLBACK)', {
        paymentKey,
        사유: 'per-payment secret 불일치',
      });
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.data.paymentStatus === 'DONE') {
      // SEC-04b: Double-verify from Toss API
      const verified = await fetchPayment(paymentKey);
      if (!verified || verified.status !== 'DONE') {
        console.error(`[toss-webhook] Toss API double-verify failed: ${paymentKey}`);
        void notifyEmail('error', '웹훅 Toss API 이중검증 실패', {
          paymentKey,
          사유: verified ? `상태 불일치: ${verified.status}` : 'API 응답 없음',
        });
        // 일시적 API 장애일 수 있으므로 500 반환 → Toss 재시도 유도
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
      }

      if (paymentRecord) {
        // 멱등성 가드: 이미 paid 상태이면 중복 처리 방지
        const { data: existingOrder } = await supabase
          .from('orders')
          .select('status, artwork_id, order_no')
          .eq('id', paymentRecord.order_id)
          .single();
        if (existingOrder?.status === 'paid') {
          return NextResponse.json({ received: true }, { status: 200 });
        }

        // Update payment status
        const existingWebhooks = Array.isArray(paymentRecord.webhook_responses)
          ? paymentRecord.webhook_responses
          : [];
        const { error: paymentUpdateError } = await supabase
          .from('payments')
          .update({
            status: 'DONE',
            approved_at: new Date().toISOString(),
            webhook_responses: [...existingWebhooks, body as Json],
          })
          .eq('id', paymentRecord.id);

        if (paymentUpdateError) {
          console.error(`[toss-webhook] payment UPDATE failed: ${paymentKey}`, paymentUpdateError);
        }

        // Update order status (awaiting_deposit → paid)
        const { data: updatedOrders, error: orderUpdateError } = await supabase
          .from('orders')
          .update({ status: 'paid', paid_at: new Date().toISOString() })
          .eq('id', paymentRecord.order_id)
          .eq('status', 'awaiting_deposit')
          .select('id');

        if (orderUpdateError) {
          console.error(
            `[toss-webhook] order UPDATE failed: ${existingOrder?.order_no}`,
            orderUpdateError
          );
          void notifyEmail('error', '웹훅 주문 상태 업데이트 실패', {
            주문번호: existingOrder?.order_no ?? '',
            paymentKey,
            에러: orderUpdateError.message,
          });
        }

        // artwork_sales + artwork 상태 갱신은 주문 UPDATE 성공 시에만
        if (updatedOrders && updatedOrders.length > 0) {
          const { data: order } = await supabase
            .from('orders')
            .select('artwork_id, total_amount, order_no, buyer_name, buyer_phone, buyer_email')
            .eq('id', paymentRecord.order_id)
            .single();

          if (order) {
            const { error: saleInsertError } = await supabase.from('artwork_sales').insert({
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

            if (saleInsertError) {
              console.error(
                `[toss-webhook] artwork_sales INSERT failed: ${order.order_no}`,
                saleInsertError
              );
              void notifyEmail('error', '웹훅 판매 기록 생성 실패', {
                주문번호: order.order_no,
                에러: saleInsertError.message,
              });
            }

            // artwork 상태 재계산 (reserved → sold)
            if (order.artwork_id) {
              await deriveAndSyncArtworkStatus(supabase, order.artwork_id);
              revalidatePublicArtworkSurfaces();
              revalidatePath(`/artworks/${order.artwork_id}`);
              revalidatePath(`/en/artworks/${order.artwork_id}`);
            }
          }

          void notifyEmail('payment', '가상계좌 입금 확인', {
            주문번호: order?.order_no ?? '',
            금액: `₩${(order?.total_amount ?? 0).toLocaleString()}`,
          });

          if (order?.buyer_email) {
            try {
              const { artworkTitle, artistName } = await getArtworkEmailInfo(
                supabase,
                order.artwork_id
              );
              void sendBuyerEmail(order.buyer_email, 'deposit_confirmed', {
                orderNo: order.order_no,
                buyerName: order.buyer_name ?? '',
                artworkTitle,
                artistName,
                amount: order.total_amount,
              });
            } catch (err) {
              console.error('[toss-webhook] deposit email failed:', err);
            }
          }
        }
      }
    } else if (payload.data.paymentStatus === 'CANCELED') {
      // 가상계좌 만료 또는 취소 — 주문 상태 변경 + artwork 복원
      console.error(`[toss-webhook] DEPOSIT_CALLBACK CANCELED: ${paymentKey}`);

      if (paymentRecord) {
        const now = new Date().toISOString();

        // awaiting_deposit → cancelled
        const { data: cancelledOrders, error: cancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: now })
          .eq('id', paymentRecord.order_id)
          .eq('status', 'awaiting_deposit')
          .select('artwork_id');

        if (cancelError) {
          console.error(
            '[toss-webhook] DEPOSIT_CALLBACK CANCELED order update failed:',
            cancelError
          );
        }

        // artwork reserved → available 복원
        if (cancelledOrders && cancelledOrders.length > 0) {
          const artworkId = cancelledOrders[0].artwork_id;
          if (artworkId) {
            const { error: artworkError } = await supabase
              .from('artworks')
              .update({ status: 'available', updated_at: now })
              .eq('id', artworkId)
              .eq('status', 'reserved');
            if (artworkError) {
              console.error('[toss-webhook] artwork reserved→available failed:', artworkError);
            }
            revalidatePublicArtworkSurfaces();
            revalidatePath(`/artworks/${artworkId}`);
            revalidatePath(`/en/artworks/${artworkId}`);
          }
        }
      }

      void notifyEmail('warning', '가상계좌 입금 취소/만료', {
        paymentKey,
        주문ID: payload.data.orderId,
      });
    }
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const newStatus = payload.data.status;

    // Toss API double-verify BEFORE any DB mutations
    const verified = await fetchPayment(paymentKey);
    if (!verified) {
      console.error(`[toss-webhook] STATUS_CHANGED Toss API verify failed: ${paymentKey}`);
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, webhook_responses')
        .eq('payment_key', paymentKey)
        .single();
      if (existingPayment) {
        const existingWebhooks = Array.isArray(existingPayment.webhook_responses)
          ? existingPayment.webhook_responses
          : [];
        const { error: auditErr } = await supabase
          .from('payments')
          .update({ webhook_responses: [...existingWebhooks, body as Json] })
          .eq('id', existingPayment.id);
        if (auditErr) console.error('[toss-webhook] audit trail write failed:', auditErr);
      }
      void notifyEmail('error', '웹훅 Toss API 검증 실패 (STATUS_CHANGED)', {
        paymentKey,
        수신상태: newStatus,
      });
      // 일시적 API 장애일 수 있으므로 500 반환 → Toss 재시도 유도
      return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
    }

    if (verified.status !== newStatus) {
      console.error(
        `[toss-webhook] STATUS_CHANGED mismatch: webhook=${newStatus}, API=${verified.status}`
      );
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id, webhook_responses')
        .eq('payment_key', paymentKey)
        .single();
      if (existingPayment) {
        const existingWebhooks = Array.isArray(existingPayment.webhook_responses)
          ? existingPayment.webhook_responses
          : [];
        const { error: auditErr } = await supabase
          .from('payments')
          .update({ webhook_responses: [...existingWebhooks, body as Json] })
          .eq('id', existingPayment.id);
        if (auditErr) console.error('[toss-webhook] audit trail write failed:', auditErr);
      }
      return NextResponse.json({ received: true }, { status: 200 });
    }

    // Update payment status
    const { data: paymentRow, error: paymentFetchError } = await supabase
      .from('payments')
      .select('id, order_id, status, webhook_responses')
      .eq('payment_key', paymentKey)
      .single();

    if (paymentFetchError || !paymentRow) {
      console.error(`[toss-webhook] STATUS_CHANGED payment fetch failed: ${paymentKey}`);
      // DB 오류 시 500 반환 → Toss 재시도 유도
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    const existingWebhooks = Array.isArray(paymentRow.webhook_responses)
      ? paymentRow.webhook_responses
      : [];

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({ status: newStatus, webhook_responses: [...existingWebhooks, body as Json] })
      .eq('id', paymentRow.id);

    if (paymentUpdateError) {
      console.error(
        `[toss-webhook] payment status UPDATE failed: ${paymentKey}`,
        paymentUpdateError
      );
    }

    // Cascade cancel to order + artwork_sales when Toss marks payment as canceled
    if (CANCELED_STATUSES.has(newStatus) && paymentRow.order_id) {
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('status, artwork_id, order_no, buyer_email, buyer_name, total_amount')
        .eq('id', paymentRow.order_id)
        .single();

      if (existingOrder && !['refunded', 'cancelled'].includes(existingOrder.status)) {
        const now = new Date().toISOString();

        const { error: orderCancelError } = await supabase
          .from('orders')
          .update({ status: 'refunded', refunded_at: now })
          .eq('id', paymentRow.order_id)
          .not('status', 'in', '("refunded","cancelled")');

        if (orderCancelError) {
          console.error(
            `[toss-webhook] order cancel UPDATE failed: ${existingOrder.order_no}`,
            orderCancelError
          );
        }

        // Void artwork_sales
        const { data: sale } = await supabase
          .from('artwork_sales')
          .select('id')
          .eq('order_id', paymentRow.order_id)
          .is('voided_at', null)
          .limit(1)
          .maybeSingle();

        if (sale) {
          const { error: voidError } = await supabase
            .from('artwork_sales')
            .update({ voided_at: now, void_reason: 'Toss 웹훅 취소 자동 처리' })
            .eq('id', sale.id);

          if (voidError) {
            console.error(`[toss-webhook] artwork_sales void failed: ${sale.id}`, voidError);
          }

          if (existingOrder.artwork_id) {
            await deriveAndSyncArtworkStatus(supabase, existingOrder.artwork_id);
          }
        }

        // artwork reserved → available 복원 (sale이 없는 경우도 처리)
        if (existingOrder.artwork_id) {
          const { error: artworkError } = await supabase
            .from('artworks')
            .update({ status: 'available', updated_at: now })
            .eq('id', existingOrder.artwork_id)
            .eq('status', 'reserved');
          if (artworkError) {
            console.error('[toss-webhook] artwork reserved→available failed:', artworkError);
          }
        }

        if (existingOrder.artwork_id) {
          revalidatePublicArtworkSurfaces();
          revalidatePath(`/artworks/${existingOrder.artwork_id}`);
          revalidatePath(`/en/artworks/${existingOrder.artwork_id}`);
        }

        void notifyEmail('warning', 'Toss 결제 취소 수신', {
          주문번호: existingOrder.order_no ?? '',
          상태: newStatus,
          paymentKey,
        });

        // 구매자 환불 이메일 발송 (fire-and-forget)
        if (existingOrder.buyer_email) {
          void (async () => {
            try {
              const { artworkTitle, artistName } = await getArtworkEmailInfo(
                supabase,
                existingOrder.artwork_id
              );
              void sendBuyerEmail(existingOrder.buyer_email!, 'refunded', {
                orderNo: existingOrder.order_no ?? '',
                buyerName: existingOrder.buyer_name ?? '',
                artworkTitle,
                artistName,
                amount: existingOrder.total_amount ?? 0,
              });
            } catch (err) {
              console.error('[toss-webhook] refund email failed:', err);
            }
          })();
        }
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
