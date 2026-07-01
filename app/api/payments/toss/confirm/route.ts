import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';

import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { notifyEmail } from '@/lib/notify';
import { logSystemAction } from '@/app/actions/activity-log-writer';
import { getOrderNotificationInfo } from '@/lib/utils/get-order-notification-info';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import { apiError, getRequestLocale } from '@/lib/api-locale';
import { promoteTossConfirmPaidOrder } from '@/lib/commerce/payment-lifecycle/toss-confirm-paid-promotion';
import {
  scheduleTossConfirmPaymentConfirmedNotifications,
  scheduleTossConfirmVirtualAccountIssuedNotifications,
} from '@/lib/commerce/payment-lifecycle/toss-confirm-success-notifications';
import { promoteTossConfirmVirtualAccount } from '@/lib/commerce/payment-lifecycle/toss-confirm-virtual-account-promotion';
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

  if (isDone) {
    const paidPromotion = await promoteTossConfirmPaidOrder({
      supabase,
      order,
      orderNo: orderId,
      paymentKey,
      tossPayment: tossResponse,
      provider,
      buyerLocale,
      idempotencyKey,
      now: new Date().toISOString(),
      logOrderStatusSyncFailure: ({
        orderId: failedOrderId,
        orderNo,
        targetStatus,
        latestStatus,
        error,
      }) =>
        logSystemAction('payment_failed', 'order', failedOrderId, {
          stage: '결제 후 주문 상태 업데이트 실패',
          order_no: orderNo,
          target_status: targetStatus,
          latest_status: latestStatus,
          error,
        }),
    });

    if (!paidPromotion.ok) {
      if (paidPromotion.code === 'PAYMENT_RECORD_FAILED') {
        return buildPaymentRecordFailureResponse(paidPromotion.error);
      }

      return NextResponse.json(
        {
          error: apiError('payment_confirmation_failed', buyerLocale),
          code: 'ORDER_STATUS_SYNC_FAILED',
        },
        { status: paidPromotion.statusCode }
      );
    }

    if (paidPromotion.status === 'already_promoted') {
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

    if (paidPromotion.status === 'contest_lost') {
      return NextResponse.json({
        success: true,
        status: 'REFUNDED',
        refunded: true,
        reason: 'artwork_taken',
      });
    }
  } else if (isVirtualAccount) {
    const virtualAccountOutcome = await promoteTossConfirmVirtualAccount({
      supabase,
      order,
      orderNo: orderId,
      paymentKey,
      tossPayment: tossResponse,
      provider,
      lineItems,
      idempotencyKey,
      now: new Date().toISOString(),
      logOrderStatusSyncFailure: ({
        orderId: failedOrderId,
        orderNo,
        targetStatus,
        latestStatus,
        error,
      }) =>
        logSystemAction('payment_failed', 'order', failedOrderId, {
          stage: '결제 후 주문 상태 업데이트 실패',
          order_no: orderNo,
          target_status: targetStatus,
          latest_status: latestStatus,
          error,
        }),
    });

    if (!virtualAccountOutcome.ok) {
      if (virtualAccountOutcome.code === 'PAYMENT_RECORD_FAILED') {
        return buildPaymentRecordFailureResponse(virtualAccountOutcome.error);
      }

      if (virtualAccountOutcome.code === 'RESERVATION_FAILED') {
        return NextResponse.json(
          { error: apiError('artwork_sold_out', buyerLocale) },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          error: apiError('payment_confirmation_failed', buyerLocale),
          code: 'ORDER_STATUS_SYNC_FAILED',
        },
        { status: virtualAccountOutcome.statusCode }
      );
    }

    if (virtualAccountOutcome.status === 'already_promoted') {
      return NextResponse.json({
        success: true,
        alreadyPromoted: true,
        status: tossResponse.status,
        virtualAccount: tossResponse.virtualAccount ?? null,
        analyticsItem: null,
        analyticsPurchase: null,
      });
    }
  }

  // 알림용 주문 컨텍스트 (작품/작가/배송지/항목별 금액 포함) — admin/buyer 공통
  const notifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });

  // 결제 성공 알림 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  if (isDone) {
    scheduleTossConfirmPaymentConfirmedNotifications({
      order,
      orderId,
      amount: tossResponse.totalAmount,
      buyerLocale,
      notifyInfo,
      paymentMethod: tossResponse.method,
    });
  } else if (isVirtualAccount) {
    const va = tossResponse.virtualAccount as
      | { bankName?: string; accountNumber?: string; dueDate?: string }
      | null
      | undefined;
    scheduleTossConfirmVirtualAccountIssuedNotifications({
      order,
      orderId,
      amount: tossResponse.totalAmount,
      buyerLocale,
      notifyInfo,
      virtualAccount: va,
    });
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
