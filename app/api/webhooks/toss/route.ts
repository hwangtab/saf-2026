import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

import type { Json } from '@/types/supabase';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { fetchPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider, type PaymentProvider } from '@/lib/integrations/toss/config';
import {
  parseWebhookPayload,
  verifyWebhookRequest,
  verifyDepositCallbackSecret,
  isDepositCallback,
  isPaymentStatusChanged,
  isEventOrderId,
} from '@/lib/integrations/toss/webhook';
import { isFundingOrderId } from '@/lib/funding/order-id';
import { notifyEmail } from '@/lib/notify';
import { handleDepositCallbackDonePromotion } from '@/lib/commerce/payment-lifecycle/deposit-callback-done-promotion';
import { repairDepositCallbackMissingPaymentRecord } from '@/lib/commerce/payment-lifecycle/deposit-missing-payment-repair';
import { handleStatusChangedDonePromotion } from '@/lib/commerce/payment-lifecycle/status-changed-done-promotion';
import { repairStatusChangedMissingPaymentRecord } from '@/lib/commerce/payment-lifecycle/status-missing-payment-repair';
import { handleDepositCallbackCanceled } from '@/lib/commerce/refund-cancel/deposit-callback-canceled';
import { handleTossCanceledPaymentCascade } from '@/lib/commerce/refund-cancel/toss-canceled-cascade';

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

  // 이벤트(추도식) 결제는 작품 결제와 같은 domestic MID(saf202i818)를 공유하므로
  // STATUS_CHANGED/DEPOSIT_CALLBACK 웹훅이 이 엔드포인트로 들어오지만, event_registrations +
  // event confirm route가 전체 라이프사이클을 처리한다. 작품 웹훅(payments/orders 기반)은
  // 이벤트 결제를 찾지 못해 provider를 api_v1(cafe24 secret)로 잘못 추정 → fetchPayment가
  // saf202i818 결제를 cafe24 secret으로 조회 → 404 → '검증 실패' 알림 + 500 재시도 폭주
  // (2026-06-15 회귀: EVT 결제마다 거짓 알림). 작품 웹훅이 처리할 수 없는 영역이므로
  // 즉시 200으로 ack(Toss 재시도 중단)한 뒤 무시한다.
  if (isEventOrderId(payload.data.orderId)) {
    return NextResponse.json({ received: true, status: 'ignored_event' }, { status: 200 });
  }

  // 펀딩 결제는 /api/webhooks/funding/toss 가 처리. 작품 webhook은 즉시 ack 후 무시.
  // FND- 주문을 이 경로에서 처리하면 payments/orders 조회 실패 → 거짓알림 + 500 재시도 폭주
  // (2026-06-15 EVT- 회귀와 동일 패턴 예방).
  if (isFundingOrderId(payload.data.orderId)) {
    return NextResponse.json({ received: true, status: 'ignored_funding' }, { status: 200 });
  }

  const supabase = createSupabaseAdminClient();

  if (isDepositCallback(payload)) {
    const paymentKey = payload.data.paymentKey;

    // Find payment record — distinguish Supabase errors from "not found"
    let { data: paymentRecord, error: paymentLookupError } = await supabase
      .from('payments')
      .select('id, order_id, webhook_responses, confirm_response')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (paymentLookupError) {
      // DB 에러: 인증 실패가 아닌 서버 에러 — Toss가 재시도할 수 있도록 500 반환
      console.error('[toss-webhook] payment lookup failed:', paymentLookupError);
      after(() =>
        notifyEmail('error', '웹훅 DB 조회 실패', {
          paymentKey,
          에러: paymentLookupError.message,
        })
      );
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }

    let provider: PaymentProvider = 'api_v1';
    if (paymentRecord?.order_id) {
      const { data: orderForProvider } = await supabase
        .from('orders')
        .select('metadata')
        .eq('id', paymentRecord.order_id)
        .single();
      provider = resolveOrderProvider(orderForProvider?.metadata);
    }

    let verifiedDepositPayment: Awaited<ReturnType<typeof fetchPayment>> | null = null;
    if (!paymentRecord && payload.data.paymentStatus === 'DONE') {
      const repairResult = await repairDepositCallbackMissingPaymentRecord({
        supabase,
        paymentKey,
        webhookOrderId: payload.data.orderId,
      });

      if (!repairResult.ok) {
        if (repairResult.code === 'ORDER_FETCH_FAILED') {
          console.error(
            `[toss-webhook] DEPOSIT_CALLBACK missing payment order fetch failed: ${paymentKey}`,
            repairResult.error
          );
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
        if (repairResult.code === 'VERIFY_FAILED') {
          console.error(
            `[toss-webhook] DEPOSIT_CALLBACK missing payment verify failed: ${paymentKey}`
          );
          after(() =>
            notifyEmail('error', '웹훅 Toss API 이중검증 실패', {
              paymentKey,
              사유: repairResult.verifiedPayment
                ? `상태/주문 불일치: ${repairResult.verifiedPayment.status}/${repairResult.verifiedPayment.orderId}`
                : 'API 응답 없음',
            })
          );
          return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
        }
        if (repairResult.code === 'PAYMENT_RECORD_FAILED') {
          console.error(
            `[toss-webhook] DEPOSIT_CALLBACK missing payment create failed: ${paymentKey}`,
            repairResult.error
          );
        } else {
          console.error(
            `[toss-webhook] DEPOSIT_CALLBACK missing payment refetch failed: ${paymentKey}`,
            repairResult.error
          );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      provider = repairResult.provider;
      verifiedDepositPayment = repairResult.verifiedPayment;
      paymentRecord = repairResult.paymentRecord;
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
      after(() =>
        notifyEmail('error', '웹훅 검증 실패 (DEPOSIT_CALLBACK)', {
          paymentKey,
          사유: 'per-payment secret 불일치',
        })
      );
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (payload.data.paymentStatus === 'DONE') {
      // SEC-04b: Double-verify from Toss API
      const verified = verifiedDepositPayment ?? (await fetchPayment(paymentKey, provider));
      if (!verified || verified.status !== 'DONE') {
        console.error(`[toss-webhook] Toss API double-verify failed: ${paymentKey}`);
        after(() =>
          notifyEmail('error', '웹훅 Toss API 이중검증 실패', {
            paymentKey,
            사유: verified ? `상태 불일치: ${verified.status}` : 'API 응답 없음',
          })
        );
        // 일시적 API 장애일 수 있으므로 500 반환 → Toss 재시도 유도
        return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
      }

      const promotionResult = await handleDepositCallbackDonePromotion({
        supabase,
        paymentRecord,
        paymentKey,
        webhookOrderId: payload.data.orderId,
        verifiedPayment: verified,
        provider,
        webhookBody: body as Json,
        now: new Date().toISOString(),
      });

      if (promotionResult.ok && promotionResult.status === 'already_paid') {
        return NextResponse.json({ received: true }, { status: 200 });
      }

      if (
        promotionResult.ok &&
        promotionResult.status === 'cancelled_order_done_refund_scheduled'
      ) {
        return NextResponse.json(
          { received: true, status: 'cancelled_order_done_refund_scheduled' },
          { status: 200 }
        );
      }

      if (!promotionResult.ok) {
        if (promotionResult.code === 'PAYMENT_RECORD_NOT_FOUND') {
          return NextResponse.json({ error: 'Payment record not found' }, { status: 500 });
        }
        if (promotionResult.code === 'PAYMENT_RECORD_FAILED') {
          console.error(
            `[toss-webhook] DEPOSIT_CALLBACK payment record ensure failed: ${paymentKey}`,
            promotionResult.error
          );
          return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    } else if (payload.data.paymentStatus === 'CANCELED') {
      // 가상계좌 만료 또는 취소 — 주문 상태 변경 + artwork 복원
      console.error(`[toss-webhook] DEPOSIT_CALLBACK CANCELED: ${paymentKey}`);

      await handleDepositCallbackCanceled({
        supabase,
        paymentOrderId: paymentRecord?.order_id ?? null,
        paymentKey,
        webhookOrderId: payload.data.orderId,
        now: new Date().toISOString(),
      });
    }
  } else if (isPaymentStatusChanged(payload)) {
    const paymentKey = payload.data.paymentKey;
    const orderId = payload.data.orderId;
    const newStatus = payload.data.status;

    // Resolve provider from payment → order metadata.
    // ABORTED 주문은 confirm 단계 전이라 payments 테이블에 행이 없을 수 있음 →
    // payments 조회 실패 시 orders.order_no(=Toss orderId)로 직접 fallback.
    let provider: PaymentProvider = 'api_v1';
    const { data: providerLookup } = await supabase
      .from('payments')
      .select('orders!inner(metadata)')
      .eq('payment_key', paymentKey)
      .maybeSingle();
    if (providerLookup?.orders) {
      const orderRow = Array.isArray(providerLookup.orders)
        ? providerLookup.orders[0]
        : providerLookup.orders;
      provider = resolveOrderProvider(orderRow?.metadata);
    } else {
      // payments 행 없음 → orders 테이블에서 직접 metadata 조회
      const { data: orderRow } = await supabase
        .from('orders')
        .select('metadata')
        .eq('order_no', orderId)
        .maybeSingle();
      if (orderRow) {
        provider = resolveOrderProvider(orderRow.metadata);
      }
    }

    // ABORTED/EXPIRED 등 confirm 전 종결 상태는 payments 행이 없을 수 있음. 추가로:
    // pending_payment 상태인 주문이 있으면 cancelled로 정리 — 그렇지 않으면 30분간
    // 살아남아 unique 작품의 다음 구매 시도가 RPC pending_count 때문에 차단됨.
    const ABORTED_STATUSES = new Set(['ABORTED', 'EXPIRED']);
    if (ABORTED_STATUSES.has(newStatus)) {
      const { data: paymentExists } = await supabase
        .from('payments')
        .select('id')
        .eq('payment_key', paymentKey)
        .maybeSingle();

      // paymentKey 기반 payments 행이 없으면 confirm 전 종결.
      // orders.order_no(=Toss orderId)로 pending_payment 주문 cancelled 처리.
      // SEC: 헤더 없이 들어온 웹훅은 위조 가능성 있으므로, Toss API 재검증 후에만 취소.
      // paymentKey가 Toss에 실재하지 않거나 status가 일치하지 않으면 무시.
      if (!paymentExists) {
        const tossPayAborted = await fetchPayment(paymentKey, provider);
        if (!tossPayAborted || !ABORTED_STATUSES.has(tossPayAborted.status)) {
          console.error(
            `[toss-webhook] ABORTED webhook rejected — paymentKey not in Toss API or status mismatch (API: ${tossPayAborted?.status ?? 'null'}): ${paymentKey}`
          );
          return NextResponse.json({ received: true, status: 'ignored' }, { status: 200 });
        }

        const { data: cancelled } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
          .eq('order_no', orderId)
          .eq('status', 'pending_payment')
          .select('order_no');

        if (cancelled && cancelled.length > 0) {
          console.error(
            `[toss-webhook] auto-cancelled pending order ${orderId} on ${newStatus} webhook`
          );
        }
        return NextResponse.json(
          { received: true, status: 'aborted_pending_cleared' },
          { status: 200 }
        );
      }
    }

    // Toss API double-verify BEFORE any DB mutations
    const verified = await fetchPayment(paymentKey, provider);
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
      after(() =>
        notifyEmail('error', '웹훅 Toss API 검증 실패 (STATUS_CHANGED)', {
          paymentKey,
          수신상태: newStatus,
        })
      );
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
    let { data: paymentRow, error: paymentFetchError } = await supabase
      .from('payments')
      .select('id, order_id, status, webhook_responses')
      .eq('payment_key', paymentKey)
      .maybeSingle();

    if (!paymentFetchError && !paymentRow && newStatus === 'DONE') {
      const repairResult = await repairStatusChangedMissingPaymentRecord({
        supabase,
        paymentKey,
        verifiedPayment: verified,
      });

      if (!repairResult.ok) {
        if (repairResult.code === 'ORDER_FETCH_FAILED') {
          console.error(
            `[toss-webhook] STATUS_CHANGED missing payment order fetch failed: ${paymentKey}`,
            repairResult.error
          );
        } else if (repairResult.code === 'PAYMENT_RECORD_FAILED') {
          console.error(
            `[toss-webhook] STATUS_CHANGED missing payment create failed: ${paymentKey}`,
            repairResult.error
          );
        } else {
          console.error(
            `[toss-webhook] STATUS_CHANGED missing payment refetch failed: ${paymentKey}`,
            repairResult.error
          );
        }
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }

      paymentRow = repairResult.paymentRow;
    }

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

    // PAYMENT_STATUS_CHANGED DONE — confirm route 실패 안전망.
    // 정상 흐름: confirm/route.ts가 INSERT payment + UPDATE order → paid + INSERT artwork_sales까지 처리.
    // 실패 시나리오: payment 기록은 성공했으나 order UPDATE 또는 artwork_sales INSERT에서 실패하면
    // order는 pending_payment로 stuck. reconcile cron이 5~28분 window에서 처리하지만 그 사이의
    // gap을 webhook으로 즉시 보정한다. 멱등성은 order.status 가드로 확보.
    if (newStatus === 'DONE' && paymentRow.order_id) {
      const promotionResult = await handleStatusChangedDonePromotion({
        supabase,
        paymentOrderId: paymentRow.order_id,
        paymentId: paymentRow.id,
        paymentKey,
        newStatus,
        verifiedPayment: verified,
        provider,
        now: new Date().toISOString(),
      });

      if (
        promotionResult.ok &&
        promotionResult.status === 'cancelled_order_done_refund_scheduled'
      ) {
        return NextResponse.json(
          { received: true, status: 'cancelled_order_done_refund_scheduled' },
          { status: 200 }
        );
      }

      if (!promotionResult.ok && promotionResult.code === 'PAYMENT_RECORD_FAILED') {
        console.error(
          `[toss-webhook] STATUS_CHANGED DONE payment record ensure failed: ${promotionResult.orderNo ?? ''}`,
          promotionResult.error
        );
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }

    // Cascade cancel to order + artwork_sales when Toss marks payment as canceled
    if (CANCELED_STATUSES.has(newStatus) && paymentRow.order_id) {
      const cascadeResult = await handleTossCanceledPaymentCascade({
        supabase,
        paymentOrderId: paymentRow.order_id,
        paymentKey,
        newStatus,
        now: new Date().toISOString(),
      });
      if (!cascadeResult.ok) {
        console.error(
          `[toss-webhook] canceled payment order fetch failed: ${paymentKey}`,
          cascadeResult.error
        );
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
