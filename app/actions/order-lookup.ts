'use server';

import { after } from 'next/server';
import { headers } from 'next/headers';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { rateLimit } from '@/lib/rate-limit';
import { hashEmail } from '@/lib/email/email-hash';
import { getClientIp } from '@/lib/security/get-client-ip';
import { runAllSettled } from '@/lib/server/after-response';
import { logBuyerAction } from './activity-log-writer';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { verifyOrderAccessToken } from '@/lib/email/order-access-token';
import {
  updateBuyerShippingMutation,
  type UpdateBuyerShippingInput,
} from '@/lib/orders/buyer-mutations';
import { cancelBuyerOrderMutation } from '@/lib/orders/buyer-cancel';
import { claimGuestOrdersMutation } from '@/lib/orders/guest-claims';
import {
  fetchPublicOrderDetailRow,
  lookupPublicOrdersByBuyer,
  type OrderDetailResult,
  type OrderLookupListResult,
  type OrderPublicInfo,
} from '@/lib/orders/public-lookup';

export type {
  OrderDetailResult,
  OrderLookupListResult,
  OrderPublicInfo,
  PublicOrderListItem,
} from '@/lib/orders/public-lookup';

export async function lookupOrders(
  name: string,
  email: string,
  phone: string
): Promise<OrderLookupListResult> {
  // Rate limiting — IP 기준 분당 5회
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`lookupOrders:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const adminClient = createSupabaseAdminClient();
  return lookupPublicOrdersByBuyer(adminClient, { name, email, phone });
}

/**
 * 비로그인(게스트)으로 결제해 buyer_user_id가 NULL인 주문을, 로그인한 회원 계정에 자동 귀속한다.
 * 가입 전 게스트로 구매 → 이후 가입/로그인한 회원이 마이페이지에서 그 주문을 못 보던 갭을 메움.
 *
 * 보안: **검증된 이메일(email_confirmed_at)** 이 회원 이메일과 정확히 일치하는 주문만 대상.
 * 미확인 이메일은 소유가 보장되지 않으므로(타인 이메일로 가입해 게스트 주문을 탈취하는 공격) 귀속하지 않는다.
 * 멱등 — 이미 귀속됐거나 대상이 없으면 무해하게 0건 반환. 마이페이지 진입 시마다 호출해도 안전.
 */
export async function claimGuestOrders(): Promise<{ claimed: number }> {
  try {
    const sessionClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await sessionClient.auth.getUser();

    if (!user) return { claimed: 0 };

    const adminClient = createSupabaseAdminClient();
    const result = await claimGuestOrdersMutation(adminClient, user);

    if (result.updateError) {
      console.error('[claimGuestOrders] update failed:', result.updateError);
      return { claimed: 0 };
    }

    return { claimed: result.claimed };
  } catch (err) {
    console.error('[claimGuestOrders] failed:', err);
    return { claimed: 0 };
  }
}

export async function lookupOrderDetail(
  orderNo: string,
  buyerEmail: string
): Promise<OrderDetailResult> {
  // Rate limiting — IP 분당 5회 + email 시간당 20회 (가상계좌 번호 노출 분산 공격 차단)
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`lookupOrderDetail:ip:${ip}`, { limit: 5, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();

  if (trimmedEmail) {
    const emailRl = await rateLimit(`lookupOrderDetail:email:${hashEmail(trimmedEmail)}`, {
      limit: 20,
      windowMs: 3_600_000,
    });
    if (!emailRl.success) {
      return { success: false, error: 'RATE_LIMITED' };
    }
  }

  const sessionClient = await createSupabaseServerClient();
  const {
    data: { user: sessionUser },
  } = await sessionClient.auth.getUser();

  if (!trimmedOrderNo || (!trimmedEmail && !sessionUser)) {
    return { success: false, error: 'REQUIRED' };
  }

  if (trimmedOrderNo.length > 50 || trimmedEmail.length > 254) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const adminClient = createSupabaseAdminClient();

  const row = await fetchPublicOrderDetailRow(adminClient, trimmedOrderNo);
  if (!row) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const isOwner = !!sessionUser && row.buyerUserId === sessionUser.id;

  if (!isOwner && !trimmedEmail) return { success: false, error: 'NOT_FOUND' };
  if (!isOwner && row.buyerEmail?.toLowerCase() !== trimmedEmail) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, order: row.info };
}

export type OrderTokenResult =
  | { success: true; order: OrderPublicInfo; buyerEmail: string }
  | { success: false; error: string };

/**
 * 이메일 본문의 서명 토큰(/orders?token=...)으로 주문 상세를 조회한다.
 * 토큰 HMAC 서명 검증 통과 자체가 인증(그 결제/배송 이메일 수신자)이므로,
 * 추가 email·세션 검증 없이 상세를 반환한다. 응답의 buyerEmail은 배송지 수정·취소 권한에 사용.
 */
export async function lookupOrderByToken(token: string): Promise<OrderTokenResult> {
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`lookupOrderByToken:ip:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const orderNo = verifyOrderAccessToken(token);
  if (!orderNo) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const adminClient = createSupabaseAdminClient();
  const row = await fetchPublicOrderDetailRow(adminClient, orderNo);
  if (!row) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, order: row.info, buyerEmail: row.buyerEmail ?? '' };
}

export type UpdateShippingInput = UpdateBuyerShippingInput;

export async function updateBuyerShipping(
  orderNo: string,
  buyerEmail: string,
  data: UpdateShippingInput
): Promise<{ success: true } | { success: false; error: string }> {
  // Rate limiting — IP 분당 3회 + email 시간당 10회 (분산 공격 차단)
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`updateBuyerShipping:ip:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();

  if (trimmedEmail) {
    const emailRl = await rateLimit(`updateBuyerShipping:email:${hashEmail(trimmedEmail)}`, {
      limit: 10,
      windowMs: 3_600_000,
    });
    if (!emailRl.success) {
      return { success: false, error: 'RATE_LIMITED' };
    }
  }

  const sessionClientShipping = await createSupabaseServerClient();
  const {
    data: { user: sessionUserShipping },
  } = await sessionClientShipping.auth.getUser();

  if (!trimmedOrderNo || (!trimmedEmail && !sessionUserShipping)) {
    return { success: false, error: 'REQUIRED' };
  }

  const adminClient = createSupabaseAdminClient();

  return updateBuyerShippingMutation(adminClient, {
    orderNo: trimmedOrderNo,
    buyerEmail: trimmedEmail,
    sessionUserId: sessionUserShipping?.id ?? null,
    shipping: data,
  });
}

export async function cancelBuyerOrder(
  orderNo: string,
  buyerEmail: string,
  cancelReason: string
): Promise<{ success: true } | { success: false; error: string }> {
  // Rate limiting — IP 분당 3회 + email 시간당 5회 (분산 공격 차단)
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`cancelBuyerOrder:ip:${ip}`, { limit: 3, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: 'RATE_LIMITED' };
  }

  const trimmedOrderNo = orderNo.trim();
  const trimmedEmail = buyerEmail.trim().toLowerCase();
  const trimmedReason = cancelReason.trim();

  if (trimmedEmail) {
    const emailRl = await rateLimit(`cancelBuyerOrder:email:${hashEmail(trimmedEmail)}`, {
      limit: 5,
      windowMs: 3_600_000,
    });
    if (!emailRl.success) {
      return { success: false, error: 'RATE_LIMITED' };
    }
  }

  const sessionClientCancel = await createSupabaseServerClient();
  const {
    data: { user: sessionUserCancel },
  } = await sessionClientCancel.auth.getUser();

  if (!trimmedOrderNo || (!trimmedEmail && !sessionUserCancel) || !trimmedReason) {
    return { success: false, error: 'REQUIRED' };
  }

  if (trimmedOrderNo.length > 50 || trimmedEmail.length > 254 || trimmedReason.length > 500) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const adminClient = createSupabaseAdminClient();

  const cancelResult = await cancelBuyerOrderMutation(adminClient, {
    orderNo: trimmedOrderNo,
    buyerEmail: trimmedEmail,
    sessionUserId: sessionUserCancel?.id ?? null,
    cancelReason: trimmedReason,
    now: new Date().toISOString(),
  });

  if (!cancelResult.success) {
    if (cancelResult.error === 'ORDER_CANCEL_FAILED' && cancelResult.syncFailure) {
      const { order, payment, code, syncError } = cancelResult.syncFailure;
      if (code === 'ORDER_UPDATE_FAILED') {
        console.error('[cancelBuyerOrder] order update failed:', syncError);
      }
      after(() =>
        runAllSettled('cancelBuyerOrder.orderSyncFailed.notifications', [
          () =>
            notifyEmail('error', 'Toss 취소 후 주문 상태 반영 실패', {
              주문번호: order.order_no,
              주문ID: order.id,
              paymentKey: payment.payment_key ?? '',
              구매자: order.buyer_name ?? '',
              구매자이메일: trimmedEmail || order.buyer_email || '',
              취소사유: trimmedReason,
              에러: syncError,
              참고: 'Toss 결제 취소는 성공했지만 내부 주문 상태가 refunded로 바뀌지 않았습니다.',
            }),
          () =>
            logBuyerAction('order_cancel_sync_failed', 'order', order.id, trimmedEmail, {
              order_no: order.order_no,
              payment_key: payment.payment_key,
              reason: trimmedReason,
              error: syncError,
            }),
        ])
      );
    }
    return { success: false, error: cancelResult.error };
  }

  const order = cancelResult.order;
  const actorEmail = trimmedEmail || order.buyer_email || '';

  // 무통장 입금 대기 — 입금 전이므로 Toss 환불·sale void 없이 주문만 취소하고 작품 예약 해제
  if (cancelResult.kind === 'awaiting_deposit') {
    for (const warning of cancelResult.warnings) {
      if (warning.code === 'RESERVATION_RELEASE_FAILED') {
        console.error('[cancelBuyerOrder] artwork restore failed:', warning.errors);
        for (const releaseError of warning.errors ?? []) {
          after(() =>
            notifyEmail('error', '구매자 입금대기 주문 취소 후 예약 해제 실패', {
              주문번호: order.order_no,
              주문ID: order.id,
              작품ID: releaseError.artworkId,
              에러:
                releaseError.error instanceof Error
                  ? releaseError.error.message
                  : ((releaseError.error as { message?: string } | null)?.message ??
                    String(releaseError.error)),
            })
          );
        }
      }
    }

    await logBuyerAction(
      'order_buyer_cancelled',
      'order',
      order.id,
      actorEmail,
      {
        order_no: order.order_no,
        reason: trimmedReason,
        artwork_id: order.artwork_id,
        buyer_name: order.buyer_name,
        total_amount: order.total_amount,
        payment_status: 'awaiting_deposit',
      },
      {
        summary: `구매자 셀프 취소(입금대기): ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, ₩${order.total_amount.toLocaleString('ko-KR')}, 사유: ${trimmedReason})`,
        reversible: false,
      }
    );

    after(async () => {
      try {
        const info = await getOrderNotificationInfo(adminClient, { id: order.id });
        await runAllSettled('cancelBuyerAwaitingOrder.notifications', [
          ...(info
            ? [
                () =>
                  notifyEmail(
                    'warning',
                    '구매자 입금대기 주문 취소 (셀프서비스)',
                    buildAdminNotificationFields(info, { 취소사유: trimmedReason })
                  ),
              ]
            : []),
          ...(order.buyer_email
            ? [
                () =>
                  sendBuyerEmail(
                    order.buyer_email!,
                    'auto_cancelled',
                    {
                      orderNo: order.order_no,
                      buyerName: order.buyer_name ?? '',
                      artworkTitle: info?.artworkTitle ?? '',
                      artistName: info?.artistName ?? '',
                      amount: order.total_amount,
                    },
                    extractBuyerLocale(order.metadata)
                  ),
              ]
            : []),
          () =>
            sendBuyerSms(
              info?.buyerPhone,
              'auto_cancelled',
              {
                buyerName: order.buyer_name ?? '',
                artworkTitle: info?.artworkTitle ?? '',
                amount: order.total_amount,
              },
              extractBuyerLocale(order.metadata),
              order.order_no
            ),
        ]);
      } catch (err) {
        console.error('[cancelBuyerOrder] awaiting cancel email failed:', err);
      }
    });

    return { success: true };
  }

  for (const warning of cancelResult.warnings) {
    if (warning.code === 'PAYMENT_UPDATE_FAILED') {
      console.error('[cancelBuyerOrder] payment update failed after Toss cancel:', warning.error);
    }
    if (warning.code === 'ARTWORK_SALES_VOID_FAILED') {
      // 환불은 이미 처리됨 — 판매기록 void 실패 시 매출 과대계상되므로 운영팀 경보(매니저 수동 void 필요).
      console.error('[cancelBuyerOrder] artwork_sales void failed:', warning.error);
      after(() =>
        notifyEmail('error', '구매자 취소 후 판매기록 void 실패 — 수동 처리 필요', {
          주문번호: order.order_no,
          주문ID: order.id,
          에러: warning.error,
        })
      );
    }
    if (warning.code === 'RESERVATION_RELEASE_FAILED') {
      console.error('[cancelBuyerOrder] reserved artwork release failed:', warning.errors);
    }
  }

  // 구매자 셀프 취소 audit log — 관리자 환불(refundOrder)과 동등한 추적성 확보
  await logBuyerAction(
    'order_buyer_cancelled',
    'order',
    order.id,
    actorEmail,
    {
      order_no: order.order_no,
      reason: trimmedReason,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
      payment_key: cancelResult.payment.payment_key,
    },
    {
      summary: `구매자 셀프 취소: ${order.order_no} (${order.buyer_name ?? '구매자 미상'}, ₩${order.total_amount.toLocaleString('ko-KR')}, 사유: ${trimmedReason})`,
      reversible: false,
    }
  );

  // 관리자 + 구매자 환불 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  after(async () => {
    try {
      const info = await getOrderNotificationInfo(adminClient, { id: order.id });

      await runAllSettled('cancelBuyerPaidOrder.notifications', [
        ...(info
          ? [
              () =>
                notifyEmail(
                  'warning',
                  '구매자 주문 취소 (셀프서비스)',
                  buildAdminNotificationFields(info, { 취소사유: trimmedReason })
                ),
            ]
          : []),
        ...(order.buyer_email
          ? [
              () =>
                sendBuyerEmail(
                  order.buyer_email!,
                  'refunded',
                  {
                    orderNo: order.order_no,
                    buyerName: order.buyer_name ?? '',
                    artworkTitle: info?.artworkTitle ?? '',
                    artistName: info?.artistName ?? '',
                    amount: order.total_amount,
                    itemAmount: info?.itemAmount,
                    shippingAmount: info?.shippingAmount,
                  },
                  extractBuyerLocale(order.metadata)
                ),
            ]
          : []),
        () =>
          sendBuyerSms(
            info?.buyerPhone,
            'refunded',
            {
              buyerName: order.buyer_name ?? '',
              artworkTitle: info?.artworkTitle ?? '',
              amount: order.total_amount,
            },
            extractBuyerLocale(order.metadata),
            order.order_no
          ),
      ]);
    } catch (err) {
      console.error('[cancelBuyerOrder] email failed:', err);
    }
  });

  return { success: true };
}
