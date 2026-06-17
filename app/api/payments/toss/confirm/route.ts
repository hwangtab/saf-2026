import { after } from 'next/server';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

import type { Json } from '@/types/supabase';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { confirmPayment } from '@/lib/integrations/toss/confirm';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { sanitizeConfirmResponse, sanitizeMethodDetail } from '@/lib/integrations/toss/sanitize';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { logSystemAction } from '@/app/actions/activity-log-writer';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { recordOrderArtworkSales, extractLineItems } from '@/lib/orders/record-artwork-sales';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { apiError, getRequestLocale } from '@/lib/api-locale';
import { runAllSettled } from '@/lib/server/after-response';

export const runtime = 'nodejs';

type OrderNotificationInfo = Awaited<ReturnType<typeof getOrderNotificationInfo>>;
const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';

function hashCheckoutToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function checkoutCookieName(orderId: string) {
  return `saf_checkout_${orderId}`;
}

function decodeCheckoutCookie(value: string | undefined): { checkoutToken: string } | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const checkoutToken = (parsed as { checkoutToken?: unknown }).checkoutToken;
    return typeof checkoutToken === 'string' && checkoutToken ? { checkoutToken } : null;
  } catch {
    return null;
  }
}

function getCheckoutTokenHash(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object') return null;
  const value = (metadata as Record<string, unknown>)[CHECKOUT_TOKEN_HASH_KEY];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function isCheckoutTokenValid(metadata: unknown, checkoutToken: string) {
  const storedHash = getCheckoutTokenHash(metadata);
  if (!storedHash || !checkoutToken) return false;
  const providedHash = hashCheckoutToken(checkoutToken);
  const stored = Buffer.from(storedHash);
  const provided = Buffer.from(providedHash);
  return stored.length === provided.length && crypto.timingSafeEqual(stored, provided);
}

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

  // Insert payment record — PII(카드번호·승인번호·휴대폰)는 저장 전 sanitize.
  // virtualAccount.secret은 후속 입금 콜백 검증에 필요하므로 sanitize 함수가 보존.
  const { error: paymentInsertError } = await supabase.from('payments').insert({
    order_id: order.id,
    payment_key: tossResponse.paymentKey,
    toss_order_id: tossResponse.orderId,
    method: tossResponse.method ?? null,
    method_detail: sanitizeMethodDetail(tossResponse) as Json,
    amount: tossResponse.totalAmount,
    currency: tossResponse.currency ?? 'KRW',
    status: tossResponse.status,
    approved_at: tossResponse.approvedAt ?? null,
    confirm_response: sanitizeConfirmResponse(tossResponse) as Json,
    idempotency_key: idempotencyKey,
  });

  if (paymentInsertError) {
    console.error('[confirm] payment INSERT 실패:', paymentInsertError);
    const insertErrMsg = paymentInsertError.message;
    after(async () => {
      await notifyEmail('error', '결제 기록 저장 실패', {
        주문번호: orderId,
        에러: insertErrMsg,
        참고: '결제는 승인 완료, 결제 기록만 누락 — reconciliation cron이 보정 예정',
      });
      await logSystemAction('payment_failed', 'order', order.id, {
        stage: '결제 기록 저장 실패(승인됨·기록 누락)',
        order_no: orderId,
        error: insertErrMsg,
      });
    });
    // 500 반환하지 않고 계속 진행 — 결제는 이미 Toss에서 승인됨
  }

  // Update order status with optimistic lock (.eq status guard) + metadata merge
  const newOrderStatus = isDone ? 'paid' : isVirtualAccount ? 'awaiting_deposit' : order.status;
  const existingMetadata = (order.metadata as Record<string, unknown>) ?? {};

  const { data: updatedOrders, error: orderUpdateError } = await supabase
    .from('orders')
    .update({
      status: newOrderStatus,
      paid_at: isDone ? new Date().toISOString() : null,
      metadata: { ...existingMetadata, payment_method: tossResponse.method ?? null },
    })
    .eq('id', order.id)
    .eq('status', 'pending_payment') // optimistic lock — 레이스로 cancelled 된 경우 스킵
    .select('id');

  if (orderUpdateError) {
    console.error('[confirm] order UPDATE 실패:', orderUpdateError);
    const updateErrMsg = orderUpdateError.message;
    after(async () => {
      await notifyEmail('error', '결제 후 주문 상태 업데이트 실패', {
        주문번호: orderId,
        에러: updateErrMsg,
        참고: '결제는 완료, 주문 상태 반영 실패 — reconciliation cron이 보정 예정',
      });
      await logSystemAction('payment_failed', 'order', order.id, {
        stage: '결제 후 주문 상태 업데이트 실패',
        order_no: orderId,
        error: updateErrMsg,
      });
    });
  }

  // 가상계좌 발급 시 artwork 예약 처리 — unique edition만 reserved 잠금.
  // limited/open은 여러 구매자가 동시 진행 가능하므로 입금 대기 중 잠그면 안 됨.
  if (isVirtualAccount && updatedOrders && updatedOrders.length > 0) {
    for (const item of lineItems) {
      const { data: artworkEdition } = await supabase
        .from('artworks')
        .select('edition_type')
        .eq('id', item.artwork_id)
        .maybeSingle();

      if (artworkEdition?.edition_type === 'unique') {
        await supabase
          .from('artworks')
          .update({ status: 'reserved' })
          .eq('id', item.artwork_id)
          .eq('status', 'available');
        revalidatePath(`/artworks/${item.artwork_id}`);
        revalidatePath(`/en/artworks/${item.artwork_id}`);
      }
    }
    revalidatePublicArtworkSurfaces();
  }

  // 레이스 컨디션: Toss 결제 성공 but 주문이 이미 취소된 경우 — 자동 환불
  // (cancelPendingOrder가 confirm API 호출 중 동시에 실행된 경우)
  if (isDone && !orderUpdateError && (!updatedOrders || updatedOrders.length === 0)) {
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
            참고: '결제 승인과 주문 취소가 동시에 발생. 자동 환불을 시도했으나 결과를 수동 확인해주세요.',
          }),
      ]);
    });
  }

  // If fully paid, insert artwork_sales record
  // (DB trigger update_artwork_status_on_sale will mark artwork as sold)
  if (isDone && updatedOrders && updatedOrders.length > 0) {
    const salesResult = await recordOrderArtworkSales(supabase, {
      orderId: order.id,
      orderNo: order.order_no,
      lineItems,
      source: 'toss',
      sourceDetail: provider === 'widget' ? 'toss_widget' : 'toss_api',
      buyerName: order.buyer_name,
      buyerPhone: order.buyer_phone,
      soldAt: new Date().toISOString(),
    });

    if (salesResult.inserted === false && salesResult.reason === 'artwork_taken') {
      // 동시 구매 경합 패배: 다른 주문이 이 unique 작품의 active 매출을 먼저 기록했고
      // (enforce_unique_edition_single_active_sale 트리거가 INSERT 차단), 이쪽은 결제가 이미
      // 캡처된 상태다. 작품을 줄 수 없으므로 자동 환불 + 주문 refunded 마킹.
      // ⚠ 이 분기에서는 deriveAndSyncArtworkStatus / 추가 매출 기록을 하지 않는다
      //   (이 주문엔 작품이 없고, 작품은 승자 주문 소유라 건드리면 안 됨).
      console.error('[confirm] unique 작품 경합 패배 — 자동 환불 진행:', orderId);

      // 주문 paid → refunded (optimistic lock: 방금 paid로 올린 이 주문만)
      const { error: refundMarkError } = await supabase
        .from('orders')
        .update({ status: 'refunded', refunded_at: new Date().toISOString() })
        .eq('id', order.id)
        .eq('status', 'paid');
      if (refundMarkError) {
        console.error('[confirm] 경합 패배 주문 refunded 마킹 실패:', refundMarkError);
      }

      // 재고 누수 방지: 이 주문의 다른(안 팔린) 라인 작품이 reserved로 남으면 해제한다.
      // 승자 주문이 소유한 sold 작품은 .eq('status','reserved') 가드로 제외됨. (card 경로는
      // reserved가 없어 no-op이지만 가상계좌·동시진행 케이스 대비 방어적으로 둠.)
      const takenReleaseIds = lineItems.map((item) => item.artwork_id);
      if (takenReleaseIds.length > 0) {
        const { error: releaseError } = await supabase
          .from('artworks')
          .update({ status: 'available', updated_at: new Date().toISOString() })
          .in('id', takenReleaseIds)
          .eq('status', 'reserved');
        if (releaseError) {
          console.error('[confirm] 경합 패배 reserved→available 해제 실패:', releaseError);
        }
        for (const artworkId of takenReleaseIds) {
          revalidatePath(`/artworks/${artworkId}`);
          revalidatePath(`/en/artworks/${artworkId}`);
        }
        revalidatePublicArtworkSurfaces();
      }

      // 자동 환불 + 결과별 알림 — 결제 응답을 블로킹하지 않도록 after()로 처리.
      // 환불 성공이 확인된 뒤에만 구매자에게 '환불' 안내(실패했는데 환불됐다고 잘못 알리는 것 방지).
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
          // 주문은 refunded인데 payments가 DONE으로 남는 불일치 해소.
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
          // 환불 실패 — 구매자에게 '환불' 안내하지 않고 운영팀에 즉시 수동환불 요청.
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

      // 정상 결제완료 알림/상태동기화는 건너뛰고 응답 반환 (환불된 주문)
      return NextResponse.json({
        success: true,
        status: 'REFUNDED',
        refunded: true,
        reason: 'artwork_taken',
      });
    }

    if (salesResult.inserted === false && salesResult.reason === 'error') {
      console.error('[confirm] artwork_sales INSERT 실패:', salesResult.error);
      after(() =>
        notifyEmail('error', '결제 후 판매 기록 생성 실패', {
          주문번호: orderId,
          에러: salesResult.error,
          참고: '결제+주문 완료, 판매 기록 누락 — reconciliation cron 보정 예정',
        })
      );
    } else if (salesResult.inserted === false && salesResult.reason === 'no_line_items') {
      // 결제 완료(paid)인데 order_items가 비어 매출이 기록되지 않음 — 정상 흐름에선
      // createOrder가 항상 order_items를 쓰므로 발생 불가. 발생 시 데이터 정합성 이상이라 알림.
      console.error('[confirm] paid order with no order_items:', orderId);
      after(() =>
        notifyEmail('error', '결제 완료 주문에 품목 없음 — 판매 기록 누락', {
          주문번호: orderId,
          참고: '결제+주문 완료이나 order_items가 비어 매출 미기록 — 수동 확인 필요',
        })
      );
    }

    // BUG 40: DB 트리거 실패 대비 방어적으로 artwork 상태 동기화
    for (const item of lineItems) {
      await deriveAndSyncArtworkStatus(supabase, item.artwork_id);
    }
  }

  // 알림용 주문 컨텍스트 (작품/작가/배송지/항목별 금액 포함) — admin/buyer 공통
  const notifyInfo = await getOrderNotificationInfo(supabase, { id: order.id });

  // 결제 완료 시 공개 작품 페이지 캐시 무효화
  if (isDone) {
    for (const item of lineItems) {
      revalidatePath(`/artworks/${item.artwork_id}`);
      revalidatePath(`/en/artworks/${item.artwork_id}`);
    }
    revalidatePublicArtworkSurfaces();
  }

  // 결제 성공 알림 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  if (isDone) {
    if (notifyInfo) {
      after(() =>
        notifyEmail(
          'payment',
          '결제 승인 완료',
          buildAdminNotificationFields(notifyInfo, {
            결제수단: tossResponse.method ?? '알 수 없음',
          })
        )
      );
    } else {
      after(() =>
        notifyEmail('payment', '결제 승인 완료', {
          주문번호: orderId,
          결제수단: tossResponse.method ?? '알 수 없음',
          금액: `₩${tossResponse.totalAmount.toLocaleString('ko-KR')}`,
        })
      );
    }
    if (order.buyer_email) {
      const buyerEmail = order.buyer_email;
      after(() =>
        sendBuyerEmail(
          buyerEmail,
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
        )
      );
    }
    after(() =>
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
      )
    );
  } else if (isVirtualAccount) {
    const va = tossResponse.virtualAccount as
      | { bankName?: string; accountNumber?: string; dueDate?: string }
      | null
      | undefined;
    if (notifyInfo) {
      after(() =>
        notifyEmail(
          'info',
          '가상계좌 발급 완료 (입금 대기)',
          buildAdminNotificationFields(notifyInfo, {
            은행: va?.bankName,
            계좌번호: va?.accountNumber,
            입금기한: va?.dueDate,
          })
        )
      );
    } else {
      after(() =>
        notifyEmail('info', '가상계좌 발급 완료 (입금 대기)', {
          주문번호: orderId,
          금액: `₩${tossResponse.totalAmount.toLocaleString('ko-KR')}`,
        })
      );
    }
    if (order.buyer_email) {
      const buyerEmail = order.buyer_email;
      after(() =>
        sendBuyerEmail(
          buyerEmail,
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
        )
      );
    }
    after(() =>
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
      )
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
