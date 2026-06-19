'use server';

import { after } from 'next/server';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient } from '@/lib/auth/server';
import { cancelPayment } from '@/lib/integrations/toss/cancel';
import { resolveOrderProvider } from '@/lib/integrations/toss/config';
import { deriveAndSyncArtworkStatus } from '@/app/actions/admin-artworks';
import { notifyEmail, sendBuyerEmail, extractBuyerLocale } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  buildAdminNotificationFields,
  getOrderNotificationInfo,
} from '@/lib/utils/get-order-notification-info';
import { rateLimit } from '@/lib/rate-limit';
import { hashEmail } from '@/lib/email/email-hash';
import { normalizePhoneDigits } from '@/lib/utils/phone';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { extractLineItems } from '@/lib/orders/record-artwork-sales';
import { releaseReservedArtworksIfUnowned } from '@/lib/orders/reservations';
import {
  getRepresentativeArtwork,
  formatRepresentativeTitle,
} from '@/lib/orders/representative-artwork';
import { getClientIp } from '@/lib/security/get-client-ip';
import { runAllSettled } from '@/lib/server/after-response';
import { logBuyerAction } from './activity-log-writer';
import { createSupabaseServerClient } from '@/lib/auth/server';
import { verifyOrderAccessToken } from '@/lib/email/order-access-token';

export type PublicOrderListItem = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  totalAmount: number;
  createdAt: string;
};

export type OrderPublicInfo = {
  orderNo: string;
  status: string;
  artworkTitle: string;
  artworkImage: string | null;
  artistName: string;
  itemAmount: number;
  shippingAmount: number;
  totalAmount: number;
  paymentMethod: string | null;
  paidAt: string | null;
  createdAt: string;
  shippingName: string;
  shippingPhone: string | null;
  shippingAddress: string;
  shippingAddressDetail: string | null;
  shippingPostalCode: string | null;
  shippingMemo: string | null;
  shippingCarrier: string | null;
  trackingNumber: string | null;
  virtualAccount: {
    bankName: string;
    accountNumber: string;
    dueDate: string;
  } | null;
};

export type OrderLookupListResult =
  | { success: true; orders: PublicOrderListItem[] }
  | { success: false; error: string };

export type OrderDetailResult =
  | { success: true; order: OrderPublicInfo }
  | { success: false; error: string };

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

  const trimmedName = name.trim();
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = normalizePhoneDigits(phone);

  if (!trimmedName || !trimmedEmail || !trimmedPhone) {
    return { success: false, error: 'REQUIRED' };
  }

  // 입력 길이 상한 — 거대 페이로드 차단
  if (trimmedName.length > 50 || trimmedEmail.length > 254 || trimmedPhone.length > 20) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: orders, error } = await adminClient
    .from('orders')
    .select(
      `
      order_no,
      status,
      total_amount,
      created_at,
      metadata,
      artworks (
        title,
        images
      ),
      order_items (
        artworks (
          title,
          images
        )
      )
    `
    )
    .eq('buyer_name', trimmedName)
    .eq('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment')
    .order('created_at', { ascending: false });

  if (error) {
    return { success: false, error: 'NOT_FOUND' };
  }

  // 휴대폰 번호 일치하는 주문만 필터 (ilike로 phone까지 하면 인덱스 미사용, 소량이므로 코드 필터)
  const { data: phoneVerifiedOrders } = await adminClient
    .from('orders')
    .select('order_no, buyer_phone')
    .eq('buyer_name', trimmedName)
    .eq('buyer_email', trimmedEmail)
    .neq('status', 'pending_payment');

  const verifiedOrderNos = new Set(
    (phoneVerifiedOrders ?? [])
      .filter((o) => normalizePhoneDigits(o.buyer_phone ?? '') === trimmedPhone)
      .map((o) => o.order_no)
  );

  if (verifiedOrderNos.size === 0) {
    return { success: false, error: 'NOT_FOUND' };
  }

  const result: PublicOrderListItem[] = (orders ?? [])
    .filter((o) => verifiedOrderNos.has(o.order_no))
    .map((o) => {
      const locale = extractBuyerLocale(o.metadata);
      const unknownLabel = locale === 'en' ? 'Unknown' : '알 수 없음';

      // 다품목(orders.artwork_id NULL) 주문은 order_items 대표작품으로 표시. 단건/legacy는 artworks fallback.
      const rep = getRepresentativeArtwork(o.order_items);
      const singleArtwork = o.artworks as unknown as { title: string; images: string[] } | null;
      const singleImages = singleArtwork?.images ?? [];

      const artworkTitle =
        rep.count > 0 && rep.title
          ? formatRepresentativeTitle(rep.title, rep.count, locale)
          : (singleArtwork?.title ?? unknownLabel);
      const artworkImage =
        rep.count > 0 ? rep.image : singleImages.length > 0 ? singleImages[0] : null;

      return {
        orderNo: o.order_no,
        status: o.status,
        artworkTitle,
        artworkImage,
        totalAmount: o.total_amount,
        createdAt: o.created_at,
      };
    });

  return { success: true, orders: result };
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

    const email = user.email?.trim().toLowerCase();
    // 검증된 이메일만 신뢰 — 미확인 이메일은 소유 보장이 없어 귀속 금지
    if (!email || !user.email_confirmed_at) return { claimed: 0 };

    const adminClient = createSupabaseAdminClient();
    const { data: claimedOrders, error } = await adminClient
      .from('orders')
      .update({ buyer_user_id: user.id })
      .is('buyer_user_id', null)
      .eq('buyer_email', email)
      .select('id');

    if (error) {
      console.error('[claimGuestOrders] update failed:', error);
      return { claimed: 0 };
    }

    return { claimed: claimedOrders?.length ?? 0 };
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

  const row = await fetchOrderDetailRow(adminClient, trimmedOrderNo);
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

type OrderDetailRow = {
  info: OrderPublicInfo;
  buyerEmail: string | null;
  buyerUserId: string | null;
};

// 주문번호로 상세(작품·작가·결제수단·가상계좌 포함)를 조회·조립하는 공통 헬퍼.
// lookupOrderDetail(이메일/세션 검증)과 lookupOrderByToken(서명 토큰 인증)이 공유한다.
// 권한 검증은 호출자 책임 — 이 함수는 조회·조립만 한다.
async function fetchOrderDetailRow(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  orderNo: string
): Promise<OrderDetailRow | null> {
  const { data: order, error } = await adminClient
    .from('orders')
    .select(
      `
      id,
      order_no,
      status,
      item_amount,
      shipping_amount,
      total_amount,
      paid_at,
      created_at,
      shipping_name,
      shipping_phone,
      shipping_postal_code,
      shipping_address,
      shipping_address_detail,
      shipping_memo,
      shipping_carrier,
      tracking_number,
      buyer_email,
      buyer_user_id,
      metadata,
      artworks (
        title,
        images,
        artists (
          name_ko
        )
      ),
      order_items (
        artworks (
          title,
          images,
          artists (
            name_ko
          )
        )
      )
    `
    )
    .eq('order_no', orderNo)
    .maybeSingle();

  if (error || !order) return null;

  const locale = extractBuyerLocale(order.metadata);
  const unknownLabel = locale === 'en' ? 'Unknown' : '알 수 없음';

  const artworkRow = order.artworks as unknown as {
    title: string;
    images: string[];
    artists: { name_ko: string } | { name_ko: string }[] | null;
  } | null;

  // 다품목(orders.artwork_id NULL) 주문은 order_items 대표작품으로 표시. 단건/legacy는 artworks fallback.
  const rep = getRepresentativeArtwork(order.order_items);

  const singleArtistRow = artworkRow?.artists;
  const singleArtistName = Array.isArray(singleArtistRow)
    ? singleArtistRow[0]?.name_ko
    : singleArtistRow?.name_ko;

  const artworkTitle =
    rep.count > 0 && rep.title
      ? formatRepresentativeTitle(rep.title, rep.count, locale)
      : (artworkRow?.title ?? unknownLabel);
  const artistName =
    rep.count > 0 ? (rep.artistName ?? unknownLabel) : (singleArtistName ?? unknownLabel);

  const singleImages = artworkRow?.images ?? [];
  const artworkImage = rep.count > 0 ? rep.image : singleImages.length > 0 ? singleImages[0] : null;

  let paymentMethod: string | null = null;
  let virtualAccount: OrderPublicInfo['virtualAccount'] = null;

  const { data: paymentRecord } = await adminClient
    .from('payments')
    .select('method, confirm_response')
    .eq('order_id', order.id)
    .maybeSingle();

  if (paymentRecord) {
    paymentMethod = paymentRecord.method ?? null;

    if (order.status === 'awaiting_deposit' && paymentRecord.confirm_response) {
      const resp = paymentRecord.confirm_response as {
        virtualAccount?: {
          bankName?: string;
          accountNumber?: string;
          dueDate?: string;
        };
      };
      const va = resp.virtualAccount;
      if (va?.bankName && va?.accountNumber && va?.dueDate) {
        virtualAccount = {
          bankName: va.bankName,
          accountNumber: va.accountNumber,
          dueDate: va.dueDate,
        };
      }
    }
  }

  return {
    info: {
      orderNo: order.order_no,
      status: order.status,
      artworkTitle,
      artworkImage,
      artistName,
      itemAmount: order.item_amount,
      shippingAmount: order.shipping_amount,
      totalAmount: order.total_amount,
      paymentMethod,
      paidAt: order.paid_at,
      createdAt: order.created_at,
      shippingName: order.shipping_name,
      shippingPhone: order.shipping_phone ?? null,
      shippingPostalCode: order.shipping_postal_code ?? null,
      shippingAddress: order.shipping_address,
      shippingAddressDetail: order.shipping_address_detail,
      shippingMemo: order.shipping_memo ?? null,
      shippingCarrier: order.shipping_carrier ?? null,
      trackingNumber: order.tracking_number ?? null,
      virtualAccount,
    },
    buyerEmail: order.buyer_email,
    buyerUserId: order.buyer_user_id,
  };
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
  const row = await fetchOrderDetailRow(adminClient, orderNo);
  if (!row) {
    return { success: false, error: 'NOT_FOUND' };
  }

  return { success: true, order: row.info, buyerEmail: row.buyerEmail ?? '' };
}

export type UpdateShippingInput = {
  shippingName: string;
  shippingPhone: string;
  shippingPostalCode?: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingMemo?: string;
};

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

  if (
    trimmedOrderNo.length > 50 ||
    trimmedEmail.length > 254 ||
    data.shippingName.length > 50 ||
    data.shippingPhone.length > 20 ||
    (data.shippingPostalCode?.length ?? 0) > 10 ||
    data.shippingAddress.length > 200 ||
    (data.shippingAddressDetail?.length ?? 0) > 200 ||
    (data.shippingMemo?.length ?? 0) > 500
  ) {
    return { success: false, error: 'INVALID_INPUT' };
  }

  const adminClient = createSupabaseAdminClient();

  const { data: order, error } = await adminClient
    .from('orders')
    .select('id, status, buyer_email, buyer_user_id')
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };

  const isOwnerShipping = !!sessionUserShipping && order.buyer_user_id === sessionUserShipping.id;

  if (!isOwnerShipping && !trimmedEmail) return { success: false, error: 'NOT_FOUND' };
  if (!isOwnerShipping && order.buyer_email?.toLowerCase() !== trimmedEmail)
    return { success: false, error: 'NOT_FOUND' };
  if (!['paid', 'preparing'].includes(order.status)) {
    return { success: false, error: 'INVALID_STATUS' };
  }

  const postalCodeUpdate = data.shippingPostalCode?.trim()
    ? { shipping_postal_code: data.shippingPostalCode.trim() }
    : {};

  const { error: updateError } = await adminClient
    .from('orders')
    .update({
      shipping_name: data.shippingName.trim(),
      shipping_phone: data.shippingPhone.trim(),
      shipping_address: data.shippingAddress.trim(),
      shipping_address_detail: data.shippingAddressDetail?.trim() ?? null,
      shipping_memo: data.shippingMemo?.trim() ?? null,
      ...postalCodeUpdate,
    })
    .eq('id', order.id)
    .in('status', ['paid', 'preparing']);

  if (updateError) return { success: false, error: 'UPDATE_FAILED' };

  return { success: true };
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

  const { data: order, error } = await adminClient
    .from('orders')
    .select(
      'id, order_no, status, total_amount, artwork_id, buyer_email, buyer_user_id, buyer_name, metadata, order_items(artwork_id, quantity, unit_price)'
    )
    .eq('order_no', trimmedOrderNo)
    .maybeSingle();

  if (error || !order) return { success: false, error: 'NOT_FOUND' };

  const isOwnerCancel = !!sessionUserCancel && order.buyer_user_id === sessionUserCancel.id;

  if (!isOwnerCancel && !trimmedEmail) return { success: false, error: 'NOT_FOUND' };
  if (!isOwnerCancel && order.buyer_email?.toLowerCase() !== trimmedEmail)
    return { success: false, error: 'NOT_FOUND' };
  if (order.status !== 'paid' && order.status !== 'awaiting_deposit') {
    return { success: false, error: 'INVALID_STATUS' };
  }

  // 무통장 입금 대기 — 입금 전이므로 Toss 환불·sale void 없이 주문만 취소하고 작품 예약 해제
  if (order.status === 'awaiting_deposit') {
    const now = new Date().toISOString();

    const { data: updatedRows, error: updateError } = await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: now, updated_at: now })
      .eq('id', order.id)
      .eq('status', 'awaiting_deposit')
      .select('id');

    if (updateError || !updatedRows || updatedRows.length === 0) {
      return { success: false, error: 'ORDER_CANCEL_FAILED' };
    }

    // 예약 해제 — order_items 라인별로 (legacy 단건은 artwork_id fallback).
    // 다품목 무통장 취소 시 첫 작품만 풀면 나머지가 영구 reserved로 남는다.
    // unique만 reserved 잠금되므로 `.eq('status','reserved')` 가드가 limited/open은 자동 skip.
    const depositLineItems = extractLineItems(order);
    const reservedArtworkIds =
      depositLineItems.length > 0
        ? depositLineItems.map((item) => item.artwork_id)
        : order.artwork_id
          ? [order.artwork_id]
          : [];

    const releaseResult = await releaseReservedArtworksIfUnowned(
      adminClient,
      reservedArtworkIds,
      now
    );
    if (releaseResult.errors) {
      console.error('[cancelBuyerOrder] artwork restore failed:', releaseResult.errors);
      for (const releaseError of releaseResult.errors) {
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
    for (const artworkId of reservedArtworkIds) {
      revalidatePath(`/artworks/${artworkId}`);
      revalidatePath(`/en/artworks/${artworkId}`);
    }
    if (reservedArtworkIds.length > 0) {
      revalidatePublicArtworkSurfaces();
    }

    await logBuyerAction(
      'order_buyer_cancelled',
      'order',
      order.id,
      trimmedEmail,
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

  const { data: payment } = await adminClient
    .from('payments')
    .select('id, payment_key, method')
    .eq('order_id', order.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment?.payment_key) return { success: false, error: 'NO_PAYMENT' };

  const provider = resolveOrderProvider(order.metadata);

  const cancelResult = await cancelPayment(
    payment.payment_key,
    { cancelReason: trimmedReason },
    `buyer-cancel-${order.order_no}`,
    provider
  );

  if (!cancelResult.success) {
    return {
      success: false,
      error: `TOSS_CANCEL_FAILED: ${(cancelResult.error as { message?: string })?.message ?? ''}`,
    };
  }

  const now = new Date().toISOString();

  const { data: cancelledRows, error: orderCancelError } = await adminClient
    .from('orders')
    .update({ status: 'refunded', refunded_at: now })
    .eq('id', order.id)
    .eq('status', 'paid')
    .select('id');

  if (orderCancelError) {
    console.error('[cancelBuyerOrder] order update failed:', orderCancelError);
    return { success: false, error: 'ORDER_CANCEL_FAILED' };
  }
  if (!cancelledRows || cancelledRows.length === 0) {
    return { success: false, error: 'ORDER_CANCEL_FAILED' };
  }

  const { error: paymentCancelError } = await adminClient
    .from('payments')
    .update({ status: 'CANCELED', cancelled_at: now })
    .eq('id', payment.id);

  if (paymentCancelError) {
    console.error('[cancelBuyerOrder] payment update failed:', paymentCancelError);
    // 주문은 이미 취소됨 — 결제 레코드 불일치 경고 로그
    // Toss 환불은 이미 처리되었으므로 주문 취소를 되돌리지 않음
  }

  // 판매기록 void — 다품목 주문은 해당 order의 active 매출 전부 void (단건 주문은 1행만 영향)
  const { error: voidError } = await adminClient
    .from('artwork_sales')
    .update({ voided_at: now, void_reason: trimmedReason })
    .eq('order_id', order.id)
    .is('voided_at', null);
  if (voidError) {
    // 환불은 이미 처리됨 — 판매기록 void 실패 시 매출 과대계상되므로 운영팀 경보(매니저 수동 void 필요).
    console.error('[cancelBuyerOrder] artwork_sales void failed:', voidError);
    after(() =>
      notifyEmail('error', '구매자 취소 후 판매기록 void 실패 — 수동 처리 필요', {
        주문번호: order.order_no,
        주문ID: order.id,
        에러: voidError.message,
      })
    );
  }

  // 작품 상태 재동기화 — order_items 라인별로 (legacy 단건은 artwork_id fallback).
  // void 이후 호출해야 활성 매출 없음 기준으로 sold→available 복원이 정확.
  const lineItems = extractLineItems(order);
  const artworkIds =
    lineItems.length > 0
      ? lineItems.map((item) => item.artwork_id)
      : order.artwork_id
        ? [order.artwork_id]
        : [];

  for (const artworkId of artworkIds) {
    await deriveAndSyncArtworkStatus(adminClient, artworkId);
    revalidatePath(`/artworks/${artworkId}`);
    revalidatePath(`/en/artworks/${artworkId}`);
  }
  if (artworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
  }

  // 구매자 셀프 취소 audit log — 관리자 환불(refundOrder)과 동등한 추적성 확보
  await logBuyerAction(
    'order_buyer_cancelled',
    'order',
    order.id,
    trimmedEmail,
    {
      order_no: order.order_no,
      reason: trimmedReason,
      artwork_id: order.artwork_id,
      buyer_name: order.buyer_name,
      total_amount: order.total_amount,
      payment_key: payment.payment_key,
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
