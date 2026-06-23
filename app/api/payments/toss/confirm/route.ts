import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { logSystemAction } from '@/app/actions/activity-log-writer';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import {
  releaseReservedArtworksIfUnowned,
  reserveUniqueArtworksOrRollback,
} from '@/lib/orders/reservations';
import { apiError, getRequestLocale } from '@/lib/api-locale';
import { runAllSettled } from '@/lib/server/after-response';
import { ensureTossPaymentRecord } from '@/lib/payments/toss-payment-record';
import { markOrderPaidWithOutcome } from '@/lib/commerce/payment-lifecycle/mark-order-paid';
import {
  checkoutCookieName,
  decodeCheckoutCookie,
  isCheckoutTokenValid,
} from '@/lib/commerce/checkout/checkout-session';

export const runtime = 'nodejs';

type OrderNotificationInfo = Awaited<ReturnType<typeof getOrderNotificationInfo>>;

function buildAnalyticsItem(
  order: { artwork_id: string | null; total_amount: number },
  notifyInfo: OrderNotificationInfo,
  fallbackAmount: number
) {
  if (!order.artwork_id) return null;
  return {
    artworkId: order.artwork_id,
    artworkTitle: notifyInfo?.artworkTitle || order.artwork_id,
    artistName: notifyInfo?.artistName || '',
    itemAmount: notifyInfo?.itemAmount ?? fallbackAmount,
    shippingAmount: notifyInfo?.shippingAmount ?? Math.max(0, fallbackAmount - order.total_amount),
  };
}

type AnalyticsPurchaseItem = {
  item_id: string;
  item_name?: string;
  price: number;
  quantity: number;
};

type AnalyticsPurchase = {
  value: number;
  shipping: number;
  items: AnalyticsPurchaseItem[];
};

/**
 * 다품목(카트) 결제용 GA4 purchase 분석 payload. order_items의 라인별로 items[]를 구성한다.
 * 단건 경로는 buildAnalyticsItem(별도 단일 shape)을 계속 쓰므로 무영향 — 이 함수는 카트
 * SuccessClient가 소비하는 items[]+shipping 형태를 만든다.
 *
 * item_name은 confirm이 작품명을 라인별로 조회하지 않으므로 생략 가능(GA 매출은 item_id로
 * 귀속됨). 다품목이 아닌 경우(라인 1개) notifyInfo의 대표 작품명을 채워 단건과 동등하게.
 */
function buildAnalyticsPurchase(
  order: { total_amount: number },
  lineItems: Array<{ artwork_id: string; quantity: number; unit_price: number }>,
  notifyInfo: OrderNotificationInfo,
  fallbackAmount: number
): AnalyticsPurchase | null {
  if (lineItems.length === 0) return null;

  const items: AnalyticsPurchaseItem[] = lineItems.map((item) => ({
    item_id: item.artwork_id,
    // 단일 라인이면 notifyInfo 대표 작품명을 사용(다품목은 요약 라벨이라 라인별로 부정확 → 생략).
    ...(lineItems.length === 1 && notifyInfo?.artworkTitle
      ? { item_name: notifyInfo.artworkTitle }
      : {}),
    price: item.unit_price,
    quantity: item.quantity,
  }));

  const shipping = notifyInfo?.shippingAmount ?? Math.max(0, fallbackAmount - order.total_amount);

  return { value: fallbackAmount, shipping, items };
}

export async function POST(req: NextRequest) {
  const reqLocale = getRequestLocale(req);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: apiError('invalid_json', reqLocale) }, { status: 400 });
  }

  const { paymentKey, orderId, amount, checkoutToken } = body as {
    paymentKey?: unknown;
    orderId?: unknown;
    amount?: unknown;
    checkoutToken?: unknown;
  };

  if (
    typeof paymentKey !== 'string' ||
    typeof orderId !== 'string' ||
    typeof amount !== 'number' ||
    (typeof checkoutToken !== 'undefined' && typeof checkoutToken !== 'string')
  ) {
    return NextResponse.json({ error: apiError('missing_fields', reqLocale) }, { status: 400 });
  }

  const resolvedCheckoutToken =
    typeof checkoutToken === 'string' && checkoutToken
      ? checkoutToken
      : (decodeCheckoutCookie(req.cookies.get(checkoutCookieName(orderId))?.value)?.checkoutToken ??
        '');

  const supabase = createSupabaseAdminClient();

  // Find the order by order_no — metadata 포함 (병합 시 필요)
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id, total_amount, status, artwork_id, order_no, buyer_name, buyer_phone, buyer_email, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('order_no', orderId)
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: apiError('order_not_found', reqLocale) }, { status: 404 });
  }

  // 주문 생성 시 저장된 locale 우선, 없으면 Accept-Language
  const storedLocale = (order.metadata as Record<string, unknown> | null)?.locale as
    | 'ko'
    | 'en'
    | undefined;
  const buyerLocale: 'ko' | 'en' =
    storedLocale === 'en' ? 'en' : storedLocale === 'ko' ? 'ko' : reqLocale;

  if (!isCheckoutTokenValid(order.metadata, resolvedCheckoutToken)) {
    return NextResponse.json(
      { error: apiError('invalid_checkout_token', buyerLocale) },
      { status: 400 }
    );
  }

  const provider = resolveOrderProvider(order.metadata);

  // SEC-01: Amount must match exactly
  // - domestic/widget/api_v1: order.total_amount(KRW)와 비교
  // - overseas (PayPal/USD): metadata.usd_amount와 비교 — createOrder 시점에 환산 저장된 값
  const expectedAmount =
    provider === 'overseas'
      ? Number((order.metadata as { usd_amount?: number } | null)?.usd_amount ?? NaN)
      : order.total_amount;
  if (!Number.isFinite(expectedAmount) || expectedAmount !== amount) {
    return NextResponse.json({ error: apiError('amount_mismatch', reqLocale) }, { status: 400 });
  }

  // Guard: pending_payment 상태에서만 승인 진행
  if (order.status !== 'pending_payment') {
    if (order.status === 'paid') {
      const paidNotifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });
      return NextResponse.json({
        success: true,
        alreadyPaid: true,
        analyticsItem: buildAnalyticsItem(order, paidNotifyInfo, order.total_amount),
        analyticsPurchase: buildAnalyticsPurchase(
          order,
          extractLineItems(order),
          paidNotifyInfo,
          order.total_amount
        ),
      });
    }
    return NextResponse.json(
      { error: `${apiError('invalid_order_status', reqLocale)} (${order.status})` },
      { status: 400 }
    );
  }

  // 레이스 컨디션 방지: createOrder와 confirm 사이에 동일 작품의 다른 주문이
  // 결제 완료될 수 있으므로, Toss confirm 호출 직전에 availability 재확인.
  // 이 체크 이후 artwork_sales INSERT 사이의 잔여 윈도우는 짧지만 0은 아님 —
  // 완전한 원자성 보장을 위해서는 artwork_sales(artwork_id) WHERE voided_at IS NULL
  // partial UNIQUE constraint를 DB 마이그레이션으로 추가하는 것이 권장됨.
  // order_items 전 품목을 순회하며 재확인 — 단건 주문은 order_items가 1행이므로
  // 기존 동작과 동일하게 1회 재확인된다. 자기 주문(p_exclude_order_id)은 제외 —
  // 그렇지 않으면 unique edition 작품의 경우 (sold=0 + pending=1) >= 1로 즉시
  // unavailable 판정됨. (lineItems는 Task 6에서 artwork_sales·status 루프에 재사용)
  // Supabase 1:N 임베드는 배열을 반환하지만, 비배열/null로 추론되는 엣지에서
  // for...of가 throw하지 않도록 Array.isArray로 방어.
  const lineItems = extractLineItems(order);

  for (const item of lineItems) {
    const { data: availResult, error: availError } = await supabase.rpc(
      'check_artwork_availability',
      { p_artwork_id: item.artwork_id, p_exclude_order_id: order.id }
    );
    const isAvailable = Array.isArray(availResult) && availResult[0]?.is_available === true;
    if (availError || !isAvailable) {
      // 작품이 이미 판매됨 — 주문 취소 후 안내
      await supabase
        .from('orders')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'pending_payment');
      return NextResponse.json({ error: apiError('artwork_sold_out', reqLocale) }, { status: 409 });
    }
  }

  // Confirm with Toss
  const idempotencyKey = `confirm-${orderId}`;
  const confirmResult = await confirmPayment(
    { paymentKey, orderId, amount },
    idempotencyKey,
    provider
  );

  if (!confirmResult.success) {
    // Mark order as cancelled on failure (optimistic lock: pending_payment일 때만)
    const { error: cancelError } = await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('id', order.id)
      .eq('status', 'pending_payment');

    if (cancelError) {
      console.error('[confirm] order cancel failed:', cancelError);
    }

    // after(): 응답 후 실행 보장 — 알림 fetch abort 방지
    const failCode = confirmResult.error.code;
    const failMsg = confirmResult.error.message;
    after(async () => {
      await notifyEmail('error', '결제 승인 실패', {
        주문번호: orderId,
        에러코드: failCode,
        메시지: failMsg,
      });
      // 결제 실패를 activity_logs에 영속화 → 관리자 알림 벨 + /admin/logs 추적
      await logSystemAction('payment_failed', 'order', order.id, {
        stage: '결제 승인 실패',
        order_no: orderId,
        error_code: failCode,
        message: failMsg,
      });
    });

    return NextResponse.json(
      { error: apiError('payment_confirmation_failed', reqLocale) },
      { status: 400 }
    );
  }

  const tossResponse = confirmResult.data;
  const isVirtualAccount = tossResponse.status === 'WAITING_FOR_DEPOSIT';
  const isDone = tossResponse.status === 'DONE';
  const existingMetadata = (order.metadata as Record<string, unknown>) ?? {};

  const buildPaymentRecordFailureResponse = (insertErrMsg: string) => {
    console.error('[confirm] payment INSERT 실패:', insertErrMsg);
    after(async () => {
      await notifyEmail('error', '결제 기록 저장 실패', {
        주문번호: orderId,
        에러: insertErrMsg,
        참고: 'Toss 승인은 완료됐지만 결제 기록 저장에 실패해 주문 상태 전환을 보류했습니다. reconciliation cron이 보정 예정입니다.',
      });
      await logSystemAction('payment_failed', 'order', order.id, {
        stage: '결제 기록 저장 실패(승인됨·기록 누락)',
        order_no: orderId,
        error: insertErrMsg,
      });
    });
    return NextResponse.json(
      { error: apiError('payment_confirmation_failed', buyerLocale) },
      { status: 500 }
    );
  };

  let reservedForVirtualAccount: string[] = [];
  const newOrderStatus = isDone ? 'paid' : isVirtualAccount ? 'awaiting_deposit' : order.status;
  let paidWarnings: Array<
    { code: 'ARTWORK_SALES_FAILED'; error: string } | { code: 'NO_LINE_ITEMS' }
  > = [];

  if (isDone) {
    const paidOutcome = await markOrderPaidWithOutcome({
      supabase,
      order,
      tossPayment: tossResponse,
      provider,
      now: new Date().toISOString(),
      sourceStatuses: ['pending_payment'],
      idempotencyKey,
      errors: [],
      continueOnSalesRecordFailure: true,
      metadataPatch: { payment_method: tossResponse.method ?? null },
    });

    if (!paidOutcome.ok) {
      if (paidOutcome.code === 'PAYMENT_RECORD_FAILED') {
        return buildPaymentRecordFailureResponse(paidOutcome.error);
      }

      if (
        paidOutcome.code === 'ORDER_UPDATE_FAILED' ||
        paidOutcome.code === 'ORDER_STATE_MISMATCH'
      ) {
        const { data: latestOrder } = await supabase
          .from('orders')
          .select('id,status')
          .eq('id', order.id)
          .single();
        const latestStatus =
          typeof latestOrder === 'object' && latestOrder && 'status' in latestOrder
            ? String(latestOrder.status)
            : null;

        if (paidOutcome.code === 'ORDER_STATE_MISMATCH' && latestStatus === newOrderStatus) {
          const paidNotifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });
          return NextResponse.json({
            success: true,
            alreadyPromoted: true,
            status: tossResponse.status,
            virtualAccount: null,
            analyticsItem: buildAnalyticsItem(order, paidNotifyInfo, tossResponse.totalAmount),
            analyticsPurchase: buildAnalyticsPurchase(
              order,
              lineItems,
              paidNotifyInfo,
              tossResponse.totalAmount
            ),
          });
        }

        const updateErrMsg =
          paidOutcome.code === 'ORDER_UPDATE_FAILED'
            ? paidOutcome.error
            : 'orders update affected 0 rows';
        console.error('[confirm] order UPDATE failed after Toss approval:', updateErrMsg);

        if (paidOutcome.code === 'ORDER_STATE_MISMATCH') {
          after(async () => {
            const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
            try {
              await cancelPayment(
                paymentKey as string,
                { cancelReason: '주문 취소 후 결제 승인 — 자동 환불' },
                `auto-refund-${orderId}`,
                provider
              );
            } catch (err) {
              console.error('[confirm] auto-refund failed:', err);
            }
            await runAllSettled('toss-confirm.cancelled-order-refund.notification', [
              () =>
                notifyEmail('error', '결제 승인 후 주문 취소 감지 — 자동 환불 시도', {
                  주문번호: orderId,
                  paymentKey: paymentKey as string,
                  참고: '결제 승인과 주문 취소가 동시에 발생. 자동 환불을 시도했으나 결과를 수동 확인해 주세요.',
                }),
            ]);
          });
        }

        after(() =>
          runAllSettled('tossConfirm.orderStatusSyncFailed.notifications', [
            () =>
              notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
                주문번호: orderId,
                목표상태: newOrderStatus,
                현재상태: latestStatus ?? '확인 실패',
                에러: updateErrMsg,
                참고: 'Toss 승인은 확인됐지만 내부 주문 상태 전이에 실패해 성공 알림과 매출 기록을 중단했습니다.',
              }),
            () =>
              logSystemAction('payment_failed', 'order', order.id, {
                stage: '결제 후 주문 상태 업데이트 실패',
                order_no: orderId,
                target_status: newOrderStatus,
                latest_status: latestStatus,
                error: updateErrMsg,
              }),
          ])
        );

        return NextResponse.json(
          {
            error: apiError('payment_confirmation_failed', buyerLocale),
            code: 'ORDER_STATUS_SYNC_FAILED',
          },
          { status: paidOutcome.code === 'ORDER_UPDATE_FAILED' ? 500 : 409 }
        );
      }

      if (paidOutcome.code === 'ARTWORK_TAKEN') {
        console.error('[confirm] unique 작품 경합 패배 — 자동 환불 진행:', orderId);

        const { error: refundMarkError } = await supabase
          .from('orders')
          .update({ status: 'refunded', refunded_at: new Date().toISOString() })
          .eq('id', order.id)
          .eq('status', 'paid');
        if (refundMarkError) {
          console.error('[confirm] 경합 패배 주문 refunded 마킹 실패:', refundMarkError);
        }

        const takenReleaseIds = paidOutcome.salesLines.map((item) => item.artwork_id);
        if (takenReleaseIds.length > 0) {
          const releaseResult = await releaseReservedArtworksIfUnowned(
            supabase,
            takenReleaseIds,
            new Date().toISOString()
          );
          if (releaseResult.errors) {
            console.error(
              '[confirm] 경합 패배 reserved→available 해제 실패:',
              releaseResult.errors
            );
          }
          for (const artworkId of takenReleaseIds) {
            revalidatePath(`/artworks/${artworkId}`);
            revalidatePath(`/en/artworks/${artworkId}`);
          }
          revalidatePublicArtworkSurfaces();
        }

        after(async () => {
          const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
          let refundOk = false;
          try {
            const result = await cancelPayment(
              paymentKey,
              { cancelReason: '동시 구매 경합으로 작품이 이미 판매되어 자동 환불' },
              `auto-refund-taken-${orderId}`,
              provider
            );
            refundOk = result.success;
            if (!result.success) {
              console.error('[confirm] 경합 패배 자동 환불 거부:', result.error);
            }
          } catch (err) {
            console.error('[confirm] 경합 패배 자동 환불 실패:', err);
          }

          if (refundOk) {
            const { error: paymentSyncError } = await supabase
              .from('payments')
              .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
              .eq('order_id', order.id);
            if (paymentSyncError) {
              console.error('[confirm] 경합 패배 payments status 정합 실패:', paymentSyncError);
            }
            await runAllSettled('toss-confirm.artwork-taken-refund.successNotifications', [
              () =>
                notifyEmail('info', '동시 구매 경합 — 자동 환불 완료', {
                  주문번호: orderId,
                  paymentKey,
                  참고: '다른 주문이 unique 작품을 먼저 가져가 자동 환불 완료.',
                }),
              ...(order.buyer_email
                ? [
                    () =>
                      sendBuyerEmail(
                        order.buyer_email!,
                        'refunded',
                        {
                          orderNo: orderId,
                          buyerName: order.buyer_name ?? '',
                          artworkTitle: '',
                          artistName: '',
                          amount: tossResponse.totalAmount,
                        },
                        buyerLocale
                      ),
                  ]
                : []),
              () =>
                sendBuyerSms(
                  order.buyer_phone,
                  'refunded',
                  {
                    buyerName: order.buyer_name ?? '',
                    artworkTitle: '',
                    amount: tossResponse.totalAmount,
                  },
                  buyerLocale,
                  orderId
                ),
            ]);
          } else {
            await runAllSettled('toss-confirm.artwork-taken-refund.failureNotifications', [
              () =>
                notifyEmail('error', '🚨 동시 구매 경합 자동 환불 실패 — 즉시 수동 환불 필요', {
                  주문번호: orderId,
                  paymentKey,
                  금액: `₩${tossResponse.totalAmount.toLocaleString('ko-KR')}`,
                  참고: '결제는 캡처됐으나 작품은 타인 선점, 자동 환불 실패. 구매자 안내 보류 — 즉시 수동 환불 처리 요망.',
                }),
            ]);
          }
        });

        return NextResponse.json({
          success: true,
          status: 'REFUNDED',
          refunded: true,
          reason: 'artwork_taken',
        });
      }

      if (paidOutcome.code === 'ARTWORK_SALES_FAILED') {
        console.error('[confirm] artwork_sales INSERT 실패:', paidOutcome.error);
        after(() =>
          notifyEmail('error', '결제 후 판매 기록 생성 실패', {
            주문번호: orderId,
            에러: paidOutcome.error,
            참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
          })
        );
      }
    } else {
      paidWarnings = paidOutcome.warnings;
    }
  } else {
    const paymentRecordResult = await ensureTossPaymentRecord({
      supabase,
      orderId: order.id,
      tossPayment: tossResponse,
      idempotencyKey,
    });

    if (!paymentRecordResult.ok) {
      return buildPaymentRecordFailureResponse(paymentRecordResult.error);
    }

    // 가상계좌는 실제 입금 안내를 보내기 전에 unique 작품 예약이 먼저 성공해야 한다.
    if (isVirtualAccount) {
      const reservationNow = new Date().toISOString();
      const reservationResult = await reserveUniqueArtworksOrRollback(
        supabase,
        lineItems.map((item) => item.artwork_id),
        reservationNow
      );

      if (!reservationResult.ok) {
        const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
        let cancelOk = false;
        let cancelError: unknown = null;
        try {
          const cancelResult = await cancelPayment(
            paymentKey,
            { cancelReason: '작품 예약 실패로 가상계좌 주문 자동 취소' },
            `auto-cancel-reservation-${orderId}`,
            provider
          );
          cancelOk = cancelResult.success;
          if (!cancelResult.success) cancelError = cancelResult.error;
        } catch (err) {
          cancelError = err;
        }

        const cancelledAt = new Date().toISOString();
        const { error: orderCancelError } = await supabase
          .from('orders')
          .update({ status: 'cancelled', cancelled_at: cancelledAt })
          .eq('id', order.id)
          .eq('status', 'pending_payment');
        if (orderCancelError) {
          console.error('[confirm] VA reservation failure order cancel failed:', orderCancelError);
        }

        if (cancelOk) {
          const { error: paymentCancelError } = await supabase
            .from('payments')
            .update({ status: 'CANCELED', cancelled_at: cancelledAt })
            .eq('order_id', order.id);
          if (paymentCancelError) {
            console.error(
              '[confirm] VA reservation failure payment sync failed:',
              paymentCancelError
            );
          }
        }

        after(() =>
          runAllSettled('toss-confirm.virtual-account-reservation-failed.notifications', [
            () =>
              notifyEmail(
                cancelOk ? 'warning' : 'error',
                '가상계좌 주문 작품 예약 실패 — 자동 취소',
                {
                  주문번호: orderId,
                  paymentKey,
                  작품ID: reservationResult.failedArtworkId,
                  Toss취소: cancelOk ? '성공' : '실패',
                  ...(cancelError ? { 에러: JSON.stringify(cancelError).slice(0, 500) } : {}),
                  참고: cancelOk
                    ? '가상계좌는 발급됐지만 작품 예약에 실패해 입금 안내 없이 주문을 취소했습니다.'
                    : '가상계좌는 발급됐지만 작품 예약에 실패했고 Toss 취소가 실패했습니다. 구매자 입금 안내는 보내지 않았으니 Toss 관리자에서 수동 확인이 필요합니다.',
                }
              ),
          ])
        );

        return NextResponse.json(
          { error: apiError('artwork_sold_out', buyerLocale) },
          { status: 409 }
        );
      }

      reservedForVirtualAccount = reservationResult.reservedArtworkIds;
    }

    // Update order status with optimistic lock (.eq status guard) + metadata merge
    const { data: updatedOrders, error: orderUpdateError } = await supabase
      .from('orders')
      .update({
        status: newOrderStatus,
        paid_at: null,
        metadata: { ...existingMetadata, payment_method: tossResponse.method ?? null },
      })
      .eq('id', order.id)
      .eq('status', 'pending_payment') // optimistic lock — 레이스로 cancelled 된 경우 스킵
      .select('id');

    const orderPromoted = Array.isArray(updatedOrders) && updatedOrders.length > 0;

    if (orderUpdateError || !orderPromoted) {
      const { data: latestOrder } = await supabase
        .from('orders')
        .select('id,status')
        .eq('id', order.id)
        .single();
      const latestStatus =
        typeof latestOrder === 'object' && latestOrder && 'status' in latestOrder
          ? String(latestOrder.status)
          : null;

      if (!orderUpdateError && latestStatus === newOrderStatus) {
        return NextResponse.json({
          success: true,
          alreadyPromoted: true,
          status: tossResponse.status,
          virtualAccount: isVirtualAccount ? (tossResponse.virtualAccount ?? null) : null,
          analyticsItem: null,
          analyticsPurchase: null,
        });
      }

      const updateErrMsg = orderUpdateError?.message ?? 'orders update affected 0 rows';
      console.error('[confirm] order UPDATE failed after Toss approval:', updateErrMsg);

      if (isVirtualAccount && !orderUpdateError) {
        await releaseReservedArtworksIfUnowned(
          supabase,
          reservedForVirtualAccount,
          new Date().toISOString()
        );
        after(async () => {
          const { cancelPayment } = await import('@/lib/integrations/toss/cancel');
          let cancelOk = false;
          let cancelError: unknown = null;
          try {
            const cancelResult = await cancelPayment(
              paymentKey,
              { cancelReason: '주문 상태 경합으로 가상계좌 주문 자동 취소' },
              `auto-cancel-race-${orderId}`,
              provider
            );
            cancelOk = cancelResult.success;
            if (!cancelResult.success) cancelError = cancelResult.error;
          } catch (err) {
            cancelError = err;
          }

          if (cancelOk) {
            const { error: paymentSyncError } = await supabase
              .from('payments')
              .update({ status: 'CANCELED', cancelled_at: new Date().toISOString() })
              .eq('order_id', order.id);
            if (paymentSyncError) {
              console.error('[confirm] VA race payment sync failed:', paymentSyncError);
            }
          }

          await runAllSettled('toss-confirm.virtual-account-race-cancel.notification', [
            () =>
              notifyEmail(
                cancelOk ? 'warning' : 'error',
                '가상계좌 주문 상태 경합 — 입금 안내 보류',
                {
                  주문번호: orderId,
                  paymentKey,
                  Toss취소: cancelOk ? '성공' : '실패',
                  ...(cancelError ? { 에러: JSON.stringify(cancelError).slice(0, 500) } : {}),
                  참고: '가상계좌는 발급됐지만 주문 상태가 이미 바뀌어 입금 안내를 보내지 않았습니다.',
                }
              ),
          ]);
        });
      }

      after(() =>
        runAllSettled('tossConfirm.orderStatusSyncFailed.notifications', [
          () =>
            notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
              주문번호: orderId,
              목표상태: newOrderStatus,
              현재상태: latestStatus ?? '확인 실패',
              에러: updateErrMsg,
              참고: 'Toss 승인은 확인됐지만 내부 주문 상태 전이에 실패해 성공 알림과 매출 기록을 중단했습니다.',
            }),
          () =>
            logSystemAction('payment_failed', 'order', order.id, {
              stage: '결제 후 주문 상태 업데이트 실패',
              order_no: orderId,
              target_status: newOrderStatus,
              latest_status: latestStatus,
              error: updateErrMsg,
            }),
        ])
      );

      return NextResponse.json(
        {
          error: apiError('payment_confirmation_failed', buyerLocale),
          code: 'ORDER_STATUS_SYNC_FAILED',
        },
        { status: orderUpdateError ? 500 : 409 }
      );
    }

    if (isVirtualAccount) {
      for (const artworkId of reservedForVirtualAccount) {
        revalidatePath(`/artworks/${artworkId}`);
        revalidatePath(`/en/artworks/${artworkId}`);
      }
      revalidatePublicArtworkSurfaces();
    }
  }

  for (const warning of paidWarnings) {
    if (warning.code === 'ARTWORK_SALES_FAILED') {
      console.error('[confirm] artwork_sales INSERT 실패:', warning.error);
      after(() =>
        notifyEmail('error', '결제 후 판매 기록 생성 실패', {
          주문번호: orderId,
          에러: warning.error,
          참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
        })
      );
    } else if (warning.code === 'NO_LINE_ITEMS') {
      console.error('[confirm] paid order with no order_items:', orderId);
      after(() =>
        notifyEmail('error', '결제 완료 주문에 품목 없음 — 판매 기록 누락', {
          주문번호: orderId,
          참고: '결제+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
        })
      );
    }
  }

  // 알림용 주문 컨텍스트 (작품/작가/배송지/항목별 금액 포함) — admin/buyer 공통
  const notifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });

  // 결제 성공 알림 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  if (isDone) {
    after(() =>
      runAllSettled('tossConfirm.paymentConfirmed.notifications', [
        () =>
          notifyInfo
            ? notifyEmail(
                'payment',
                '결제 승인 완료',
                buildAdminNotificationFields(notifyInfo, {
                  결제수단: tossResponse.method ?? '알 수 없음',
                })
              )
            : notifyEmail('payment', '결제 승인 완료', {
                주문번호: orderId,
                결제수단: tossResponse.method ?? '알 수 없음',
                금액: `₩${tossResponse.totalAmount.toLocaleString('ko-KR')}`,
              }),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
                  'payment_confirmed',
                  {
                    orderNo: orderId,
                    buyerName: order.buyer_name ?? '',
                    artworkTitle: notifyInfo?.artworkTitle ?? '',
                    artistName: notifyInfo?.artistName ?? '',
                    amount: tossResponse.totalAmount,
                    paymentMethod: tossResponse.method ?? undefined,
                    itemAmount: notifyInfo?.itemAmount,
                    shippingAmount: notifyInfo?.shippingAmount,
                    shipping: notifyInfo
                      ? {
                          name: notifyInfo.shippingName,
                          phone: notifyInfo.shippingPhone,
                          address: notifyInfo.shippingAddress,
                          memo: notifyInfo.shippingMemo,
                        }
                      : undefined,
                  },
                  buyerLocale
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            order.buyer_phone,
            'payment_confirmed',
            {
              buyerName: order.buyer_name ?? '',
              artworkTitle: notifyInfo?.artworkTitle ?? '',
              amount: tossResponse.totalAmount,
            },
            buyerLocale,
            orderId
          ),
      ])
    );
  } else if (isVirtualAccount) {
    const va = tossResponse.virtualAccount as
      | { bankName?: string; accountNumber?: string; dueDate?: string }
      | null
      | undefined;
    after(() =>
      runAllSettled('tossConfirm.virtualAccountIssued.notifications', [
        () =>
          notifyInfo
            ? notifyEmail(
                'info',
                '가상계좌 발급 완료 (입금 대기)',
                buildAdminNotificationFields(notifyInfo, {
                  은행: va?.bankName,
                  계좌번호: va?.accountNumber,
                  입금기한: va?.dueDate,
                })
              )
            : notifyEmail('info', '가상계좌 발급 완료 (입금 대기)', {
                주문번호: orderId,
                금액: `₩${tossResponse.totalAmount.toLocaleString('ko-KR')}`,
              }),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
                  'virtual_account_issued',
                  {
                    orderNo: orderId,
                    buyerName: order.buyer_name ?? '',
                    artworkTitle: notifyInfo?.artworkTitle ?? '',
                    artistName: notifyInfo?.artistName ?? '',
                    amount: tossResponse.totalAmount,
                    virtualAccount: {
                      bankName: va?.bankName,
                      accountNumber: va?.accountNumber,
                      dueDate: va?.dueDate,
                    },
                  },
                  buyerLocale
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            order.buyer_phone,
            'virtual_account_issued',
            {
              buyerName: order.buyer_name ?? '',
              artworkTitle: notifyInfo?.artworkTitle ?? '',
              amount: tossResponse.totalAmount,
              virtualAccount: {
                bankName: va?.bankName,
                accountNumber: va?.accountNumber,
                dueDate: va?.dueDate,
              },
            },
            buyerLocale,
            orderId
          ),
      ])
    );
  }

  return NextResponse.json({
    success: true,
    status: tossResponse.status,
    virtualAccount: isVirtualAccount ? (tossResponse.virtualAccount ?? null) : null,
    analyticsItem: isDone ? buildAnalyticsItem(order, notifyInfo, tossResponse.totalAmount) : null,
    analyticsPurchase: isDone
      ? buildAnalyticsPurchase(order, lineItems, notifyInfo, tossResponse.totalAmount)
      : null,
  });
}
