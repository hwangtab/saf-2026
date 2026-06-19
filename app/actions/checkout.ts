'use server';

import crypto from 'crypto';
import { after } from 'next/server';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/auth/server';
import { getClientIp } from '@/lib/security/get-client-ip';
import { revalidatePublicArtworkSurfaces } from '@/lib/utils/revalidate';
import { parsePrice } from '@/lib/parsePrice';
import {
  calculateShippingFee,
  getTossAuthHeader,
  getTossConfig,
  type PaymentProvider,
} from '@/lib/integrations/toss/config';
import { fetchWithTimeout } from '@/lib/integrations/toss/fetch-with-timeout';
import { generateOrderNumber } from '@/lib/integrations/toss/order-number';
import { normalizeOrderItems } from '@/lib/orders/normalize-items';
import type { TossErrorResponse } from '@/lib/integrations/toss/types';
import { rateLimit } from '@/lib/rate-limit';
import { SITE_URL, SITE_URL_ALIAS } from '@/lib/constants';
import { apiError, type ApiErrorCode, type ApiLocale } from '@/lib/api-locale';
import { krwToUsd } from '@/lib/utils/currency';
import { notifyEmail, sendBuyerEmail } from '@/lib/notify';
import { sendBuyerSms } from '@/lib/sms/buyer-sms';
import {
  getOrderNotificationInfo,
  buildAdminNotificationFields,
} from '@/lib/utils/get-order-notification-info';
import { runAllSettled } from '@/lib/server/after-response';

// 무통장 계좌이체 안내 — 한국스마트협동조합 기업은행 (IBK)
// (messages/*.json bankTransfer*와 동기 유지 필요)
const BANK_TRANSFER_INFO = {
  bankName: '기업은행 (IBK)',
  accountNumber: '301-101031-04-095',
  holderName: '한국스마트협동조합',
} as const;
const DEPOSIT_DEADLINE_HOURS = 24;

function formatBankTransferDueDate(date: Date, locale: ApiLocale) {
  return locale === 'ko'
    ? date.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
    : date.toLocaleString('en-US', { timeZone: 'Asia/Seoul' });
}

export type CreateOrderInput = {
  /** 단건 바로구매(quantity 1). items가 있으면 무시됨. */
  artworkId?: string;
  /** 다품목(장바구니) 주문. 있으면 artworkId보다 우선. */
  items?: Array<{ artworkId: string; quantity?: number }>;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingAddressDetail?: string;
  shippingPostalCode: string;
  shippingMemo?: string;
  locale?: 'ko' | 'en';
  /** 장바구니 결제 경로. true면 무통장 redirect를 카트 success 페이지로 보낸다. */
  cartCheckout?: boolean;
};

export type CreateOrderResult =
  | {
      success: true;
      orderId: string;
      orderNo: string;
      totalAmount: number;
      orderName: string;
      checkoutToken: string;
    }
  | { success: false; error: string; unavailable?: string[] };

const MAX_ORDER_NO_INSERT_RETRIES = 3;
const CHECKOUT_TOKEN_BYTES = 32;
const CHECKOUT_TOKEN_HASH_KEY = 'checkout_token_hash';
const CHECKOUT_COOKIE_MAX_AGE_SECONDS = 60 * 60;

type CheckoutCookiePayload = {
  orderId: string;
  checkoutToken: string;
  currency?: 'KRW' | 'USD';
};

function isOrderNoUniqueViolation(error: unknown) {
  const typed = error as { code?: string; message?: string } | null;
  if (!typed) return false;
  return (
    typed.code === '23505' ||
    typed.message?.includes('orders_order_no_key') ||
    typed.message?.includes('duplicate key value') ||
    false
  );
}

function generateCheckoutToken() {
  return crypto.randomBytes(CHECKOUT_TOKEN_BYTES).toString('base64url');
}

function hashCheckoutToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
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

function checkoutCookieName(orderId: string) {
  return `saf_checkout_${orderId}`;
}

function latestCheckoutCookieName(artworkId: string) {
  const key = crypto.createHash('sha256').update(artworkId).digest('hex').slice(0, 32);
  return `saf_checkout_latest_${key}`;
}

function encodeCheckoutCookie(payload: CheckoutCookiePayload) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function decodeCheckoutCookie(value: string | undefined): CheckoutCookiePayload | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const payload = parsed as Partial<CheckoutCookiePayload>;
    if (typeof payload.orderId !== 'string' || typeof payload.checkoutToken !== 'string') {
      return null;
    }
    return {
      orderId: payload.orderId,
      checkoutToken: payload.checkoutToken,
      currency: payload.currency === 'USD' ? 'USD' : payload.currency === 'KRW' ? 'KRW' : undefined,
    };
  } catch {
    return null;
  }
}

/** 주문별 쿠키 단일 출처 헬퍼 — 쿠키 옵션/이름/인코딩이 한 곳에서 관리됨. */
async function setOrderCheckoutCookie(
  orderNo: string,
  checkoutToken: string,
  currency: 'KRW' | 'USD'
) {
  const cookieStore = await cookies();
  const value = encodeCheckoutCookie({ orderId: orderNo, checkoutToken, currency });
  cookieStore.set(checkoutCookieName(orderNo), value, {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CHECKOUT_COOKIE_MAX_AGE_SECONDS,
  });
}

async function rememberCheckoutCookie(
  artworkId: string,
  orderId: string,
  checkoutToken: string,
  currency: 'KRW' | 'USD'
) {
  await setOrderCheckoutCookie(orderId, checkoutToken, currency);
  const cookieStore = await cookies();
  const value = encodeCheckoutCookie({ orderId, checkoutToken, currency });
  cookieStore.set(latestCheckoutCookieName(artworkId), value, {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CHECKOUT_COOKIE_MAX_AGE_SECONDS,
  });
}

async function getCheckoutCookieByOrder(orderId: string) {
  if (!orderId) return null;
  const cookieStore = await cookies();
  return decodeCheckoutCookie(cookieStore.get(checkoutCookieName(orderId))?.value);
}

async function getLatestCheckoutCookie(artworkId: string) {
  if (!artworkId) return null;
  const cookieStore = await cookies();
  return decodeCheckoutCookie(cookieStore.get(latestCheckoutCookieName(artworkId))?.value);
}

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const {
    buyerName,
    buyerEmail,
    buyerPhone,
    shippingName,
    shippingPhone,
    shippingAddress,
    shippingAddressDetail,
    shippingPostalCode,
    shippingMemo,
    locale,
  } = input;
  const buyerLocale: ApiLocale = locale === 'en' ? 'en' : 'ko';
  const buyerEmailNorm = buyerEmail.trim().toLowerCase();

  // 단건(artworkId) / 다건(items[]) 입력을 단일 OrderItemInput[]로 정규화
  const orderItems = normalizeOrderItems({ artworkId: input.artworkId, items: input.items });
  if (orderItems.length === 0) {
    return { success: false, error: apiError('required_buyer_info', buyerLocale) };
  }

  // Rate limiting — IP 기준 분당 10회
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`createOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: apiError('rate_limited', buyerLocale) };
  }

  // Basic validation
  if (!buyerName || !buyerEmail || !buyerPhone) {
    return { success: false, error: apiError('required_buyer_info', buyerLocale) };
  }
  if (!shippingAddress || !shippingPostalCode) {
    return { success: false, error: apiError('required_shipping_info', buyerLocale) };
  }

  // 입력 길이 상한 — 거대 페이로드로 DB INSERT/이메일 렌더 비용 폭주 방지
  if (
    buyerName.length > 50 ||
    buyerEmail.length > 254 ||
    buyerPhone.length > 20 ||
    shippingName.length > 50 ||
    shippingPhone.length > 20 ||
    shippingAddress.length > 200 ||
    (shippingAddressDetail?.length ?? 0) > 200 ||
    shippingPostalCode.length > 10 ||
    (shippingMemo?.length ?? 0) > 500
  ) {
    return { success: false, error: apiError('invalid_input_length', buyerLocale) };
  }

  // Format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(buyerEmailNorm)) {
    return { success: false, error: apiError('invalid_email_format', buyerLocale) };
  }
  // 전화번호: ITU E.164 — 국가코드 포함 7-15 digits 허용 (한국 9-11도 포함)
  const phoneDigits = buyerPhone.replace(/\D/g, '');
  if (phoneDigits.length < 7 || phoneDigits.length > 15) {
    return { success: false, error: apiError('invalid_phone_format', buyerLocale) };
  }
  const shippingPhoneDigits = shippingPhone.replace(/\D/g, '');
  if (shippingPhone && (shippingPhoneDigits.length < 7 || shippingPhoneDigits.length > 15)) {
    return { success: false, error: apiError('invalid_shipping_phone_format', buyerLocale) };
  }
  // 우편번호: ko는 5자리 숫자, en은 알파+숫자+공백+하이픈 3-10자
  // (예: US 12345 / 12345-6789, UK SW1A 1AA, Canada K1A 0B1, Japan 123-4567)
  const trimmedPostal = shippingPostalCode.trim();
  const postalValid =
    buyerLocale === 'ko'
      ? /^\d{5}$/.test(trimmedPostal)
      : /^[A-Za-z0-9 -]{3,10}$/.test(trimmedPostal);
  if (!postalValid) {
    return { success: false, error: apiError('invalid_postal_code', buyerLocale) };
  }

  const adminClient = createSupabaseAdminClient();

  // Fetch artworks in bulk (parse price server-side — never trust client)
  const artworkIds = orderItems.map((i) => i.artworkId);
  const { data: artworks, error: artworkError } = await adminClient
    .from('artworks')
    .select('id, title, price, status, edition_type, artists(name_ko)')
    .in('id', artworkIds)
    .eq('is_hidden', false);

  if (artworkError || !artworks || artworks.length !== artworkIds.length) {
    return { success: false, error: apiError('artwork_not_found', buyerLocale) };
  }
  const artworkById = new Map(artworks.map((a) => [a.id, a]));

  // 동일 구매자의 각 작품에 대한 오래된 pending_payment 주문 자동 정리.
  // buyer_email은 본인 인증 수단이 아니므로, 현재 결제 가능성이 있는 최근 주문은 건드리지 않는다.
  // 다품목 주문은 orders.artwork_id가 null이므로 order_items까지 보는 RPC가 단일 출처다.
  const pendingPaymentCleanupCutoff = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { error: cleanupError } = await adminClient.rpc(
    'cancel_stale_pending_orders_for_buyer_artworks',
    {
      p_buyer_email: buyerEmailNorm,
      p_artwork_ids: artworkIds,
      p_cutoff: pendingPaymentCleanupCutoff,
    }
  );
  if (cleanupError) {
    console.error('[checkout] stale pending cleanup failed:', cleanupError);
    return { success: false, error: apiError('availability_check_failed', buyerLocale) };
  }

  // 품목별 재고 재확인 + 금액 계산 + unique 강제(품절 부분 차단)
  // 순차 처리 — 장바구니 품목 수는 작아 N+1 비용 미미(병렬화 불필요).
  const unavailable: string[] = [];
  let itemAmount = 0;
  const itemRows: Array<{ artwork_id: string; quantity: number; unit_price: number }> = [];
  for (const { artworkId, quantity } of orderItems) {
    const art = artworkById.get(artworkId)!;
    const qty = art.edition_type === 'unique' ? 1 : quantity; // unique 강제
    const { data: availResult, error: availError } = await adminClient.rpc(
      'check_artwork_availability',
      { p_artwork_id: artworkId }
    );
    // RPC 자체 실패는 '품절'과 구분 — 결제 가부를 알 수 없으므로 즉시 중단
    if (availError) {
      return { success: false, error: apiError('availability_check_failed', buyerLocale) };
    }
    const availRow = Array.isArray(availResult) ? availResult[0] : null;
    const ok = availRow?.is_available === true;
    const unitPrice = parsePrice(art.price);
    if (!ok || !Number.isFinite(unitPrice) || unitPrice <= 0) {
      unavailable.push(artworkId);
      continue;
    }
    // limited edition 수량 상한 검증 — RPC의 is_available은 "≥1 가능"만 보므로
    // edition_limit보다 많은 수량을 한 번에 주문하면 오버셀된다. 남은 재고
    // (edition_limit - sold - pending) 미만으로만 허용(초과 시 해당 항목 부분 차단).
    // unique는 위에서 qty=1로 강제됐고, open은 상한 없음.
    if (art.edition_type === 'limited' && typeof availRow?.artwork_edition_limit === 'number') {
      const soldCount = Number(availRow.sold_count ?? 0);
      const pendingCount = Number(availRow.pending_count ?? 0);
      if (soldCount + pendingCount + qty > availRow.artwork_edition_limit) {
        unavailable.push(artworkId);
        continue;
      }
    }
    itemAmount += unitPrice * qty;
    itemRows.push({ artwork_id: artworkId, quantity: qty, unit_price: unitPrice });
  }
  if (unavailable.length > 0) {
    // 단건 주문은 기존 UX 유지 — 작품 status가 여전히 available인데 RPC가 막았다면
    // 타인의 미결제 주문(pending_payment 30분 / awaiting_deposit 24시간)이 잠근 "일시 보류"
    // 상태다. '이미 판매됨'으로 안내하면 영구 품절로 오인해 이탈한다(2026-06-12 감사).
    if (orderItems.length === 1) {
      const heldArt = artworkById.get(unavailable[0]);
      const availabilityErrorCode =
        heldArt?.status === 'available' ? 'artwork_temporarily_held' : 'artwork_sold_out';
      return {
        success: false,
        error: apiError(availabilityErrorCode, buyerLocale),
        unavailable,
      };
    }
    return { success: false, error: apiError('artwork_sold_out', buyerLocale), unavailable };
  }

  // 배송료/총액 — 정책상 주문당 1회만 합산
  const shippingAmount = calculateShippingFee(itemAmount);
  const totalAmount = itemAmount + shippingAmount;

  // orderName — 단건은 "제목 (작가)", 다건은 "제목 외 N건" (첫 itemRows 작품 기준)
  const firstArtwork = artworkById.get(itemRows[0].artwork_id)!;
  const firstArtistRow = firstArtwork.artists as { name_ko: string } | { name_ko: string }[] | null;
  const firstArtistName = Array.isArray(firstArtistRow)
    ? (firstArtistRow[0]?.name_ko ?? 'Unknown Artist')
    : (firstArtistRow?.name_ko ?? 'Unknown Artist');
  const orderName =
    itemRows.length === 1
      ? `${firstArtwork.title} (${firstArtistName})`
      : `${firstArtwork.title} 외 ${itemRows.length - 1}건`;

  // Optionally resolve logged-in user
  let buyerUserId: string | null = null;
  try {
    const serverClient = await createSupabaseServerClient();
    const {
      data: { user },
    } = await serverClient.auth.getUser();
    buyerUserId = user?.id ?? null;
  } catch {
    // Non-auth environment — guest checkout
    buyerUserId = null;
  }

  // Insert order (order_no UNIQUE 충돌 시 최대 3회 재시도)
  let order: {
    id: string;
  } | null = null;
  let orderNo = '';
  const checkoutToken = generateCheckoutToken();
  const checkoutTokenHash = hashCheckoutToken(checkoutToken);

  for (let attempt = 1; attempt <= MAX_ORDER_NO_INSERT_RETRIES; attempt++) {
    orderNo = generateOrderNumber();

    const { data: insertedOrder, error: insertError } = await adminClient
      .from('orders')
      .insert({
        order_no: orderNo,
        // 단건은 기존과 동일하게 artwork_id/quantity 직접 기록.
        // 다건은 artwork_id=null, quantity=총수량 — 품목 상세는 order_items에 기록.
        artwork_id: itemRows.length === 1 ? itemRows[0].artwork_id : null,
        quantity:
          itemRows.length === 1
            ? itemRows[0].quantity
            : itemRows.reduce((s, i) => s + i.quantity, 0),
        buyer_name: buyerName,
        buyer_email: buyerEmailNorm,
        buyer_phone: buyerPhone,
        buyer_user_id: buyerUserId,
        shipping_name: shippingName,
        shipping_phone: shippingPhone,
        shipping_address: shippingAddress,
        shipping_address_detail: shippingAddressDetail?.trim() || null,
        shipping_postal_code: shippingPostalCode,
        shipping_memo: shippingMemo ?? null,
        item_amount: itemAmount,
        shipping_amount: shippingAmount,
        total_amount: totalAmount,
        status: 'pending_payment',
        metadata: {
          locale: buyerLocale,
          payment_provider: buyerLocale === 'en' ? 'overseas' : 'domestic',
          [CHECKOUT_TOKEN_HASH_KEY]: checkoutTokenHash,
          // 영문 주문은 PayPal(USD) 결제이므로 환산 USD 금액을 시점 고정해서 저장.
          // confirm 시점에 Toss가 USD로 amount를 반환하면 이 값으로 검증.
          ...(buyerLocale === 'en' ? { usd_amount: krwToUsd(totalAmount) } : {}),
        },
      })
      .select('id')
      .single();

    if (!insertError && insertedOrder) {
      order = insertedOrder;
      break;
    }

    if (!isOrderNoUniqueViolation(insertError)) {
      return { success: false, error: apiError('order_creation_failed', buyerLocale) };
    }

    console.error(`[checkout] ORDER_NO_COLLISION_RETRY attempt=${attempt}`);
  }

  if (!order) {
    return { success: false, error: apiError('order_creation_failed', buyerLocale) };
  }

  // order_items 일괄 INSERT — 실패 시 방금 만든 주문을 롤백해 고아 주문 방지
  const { error: itemsInsertError } = await adminClient.from('order_items').insert(
    itemRows.map((r) => ({
      order_id: order!.id,
      artwork_id: r.artwork_id,
      quantity: r.quantity,
      unit_price: r.unit_price,
    }))
  );
  if (itemsInsertError) {
    await adminClient.from('orders').delete().eq('id', order.id);
    return { success: false, error: apiError('order_creation_failed', buyerLocale) };
  }

  if (itemRows.length === 1) {
    // 단건 바로구매: artworkId 기반 latest 쿠키 + 주문별 쿠키 (기존 동작)
    await rememberCheckoutCookie(
      itemRows[0].artwork_id,
      orderNo,
      checkoutToken,
      buyerLocale === 'en' ? 'USD' : 'KRW'
    );
  } else {
    // 다건: latest 쿠키 키 충돌 우려가 있으므로 주문별 쿠키만 설정
    await setOrderCheckoutCookie(orderNo, checkoutToken, buyerLocale === 'en' ? 'USD' : 'KRW');
  }

  return {
    success: true,
    orderId: order.id,
    orderNo,
    totalAmount,
    orderName,
    checkoutToken,
  };
}

export type InitiatePaymentInput = {
  /**
   * Toss 결제 method:
   * - 'CARD' / 'TRANSFER' / 'VIRTUAL_ACCOUNT' / 'MOBILE_PHONE' (국내)
   * - 'FOREIGN_EASY_PAY' (해외 PayPal)
   */
  method: string;
  /**
   * 간편결제 직접 라우팅. method='CARD'와 함께 사용하면 사용자가 결제수단 선택 단계
   * 없이 바로 해당 간편결제 앱/웹으로 이동.
   * 예: 'KAKAOPAY' / 'TOSSPAY' / 'NAVERPAY' / 'PAYCO' / 'SAMSUNGPAY' / 'APPLEPAY'
   */
  easyPay?: string;
  orderNo: string;
  orderName: string;
  totalAmount: number;
  buyerName: string;
  buyerEmail: string;
  checkoutToken: string;
  successUrl: string;
  failUrl: string;
  /** locale 기준으로 provider 결정 (ko → domestic, en → overseas) */
  locale?: 'ko' | 'en';
};

export type InitiatePaymentResult =
  | { success: true; checkoutUrl: string }
  | { success: false; error: string };

/**
 * POST /v1/payments — Toss-hosted 결제창 URL 발급.
 *
 * locale에 따라 provider 자동 선택:
 * - ko → 'domestic' (saf202i818)
 * - en → 'overseas' (saf202719y, PayPal)
 *
 * 위 두 MID는 모두 API 개별 연동 키 사용 (live_ck_/live_sk_).
 */
export async function initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentResult> {
  const buyerLocale: ApiLocale = input.locale === 'en' ? 'en' : 'ko';
  const provider: PaymentProvider = buyerLocale === 'en' ? 'overseas' : 'domestic';

  // Rate limiting
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`initiatePayment:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) {
    return { success: false, error: apiError('rate_limited', buyerLocale) };
  }

  // redirect URL origin 검증 — 외부 URL 주입 방지
  const allowedOrigins = [new URL(SITE_URL).origin, new URL(SITE_URL_ALIAS).origin];
  const isValidUrl = (url: string) => {
    try {
      return allowedOrigins.includes(new URL(url).origin);
    } catch {
      return false;
    }
  };
  if (!isValidUrl(input.successUrl) || !isValidUrl(input.failUrl)) {
    return { success: false, error: apiError('invalid_redirect_url', buyerLocale) };
  }

  // DB 주문 검증 — 클라이언트 전달 금액·상태를 신뢰하지 않고 DB에서 재조회
  const adminClient = createSupabaseAdminClient();
  const { data: dbOrder } = await adminClient
    .from('orders')
    .select('total_amount, status, metadata')
    .eq('order_no', input.orderNo)
    .maybeSingle();

  if (!dbOrder) {
    return { success: false, error: apiError('order_not_found', buyerLocale) };
  }
  if (dbOrder.status !== 'pending_payment') {
    return { success: false, error: apiError('invalid_order_status', buyerLocale) };
  }
  if (dbOrder.total_amount !== input.totalAmount) {
    return { success: false, error: apiError('amount_mismatch', buyerLocale) };
  }
  if (!isCheckoutTokenValid(dbOrder.metadata, input.checkoutToken)) {
    return { success: false, error: apiError('invalid_checkout_token', buyerLocale) };
  }

  // overseas 결제는 createOrder가 metadata.usd_amount를 미리 고정해두므로 그 값을 단일 출처로
  // 사용. krwToUsd()를 initiatePayment 시점에 재계산하면 NEXT_PUBLIC_KRW_USD_RATE 변경 +
  // 재배포 사이에 confirm route의 expectedAmount(=metadata.usd_amount)와 mismatch 발생.
  const storedUsdAmount =
    typeof dbOrder.metadata === 'object' &&
    dbOrder.metadata !== null &&
    typeof (dbOrder.metadata as Record<string, unknown>).usd_amount === 'number'
      ? ((dbOrder.metadata as Record<string, unknown>).usd_amount as number)
      : null;

  const config = getTossConfig(provider);
  if (!config) {
    return { success: false, error: apiError('payment_session_failed', buyerLocale) };
  }

  // PayPal foreignEasyPay 페이로드 — products 정보 포함하여 리스크 검증 통과율 향상.
  // (Toss 가이드: PayPal 판매자 보호를 받으려면 상품/배송 정보 권장)
  // shipping은 형식 명세가 불확실해서 제외 (선택 필드).
  // usd_amount는 createOrder가 고정한 metadata 값을 사용 — 환율 재배포 시 confirm route와의
  // mismatch 차단. metadata에 값이 없는 legacy 주문(이전 createOrder 호출분)만 fallback 계산.
  const usdAmount = storedUsdAmount ?? krwToUsd(input.totalAmount);
  const buildForeignEasyPay = () => ({
    country: 'KR',
    products: [
      {
        name: input.orderName.slice(0, 127),
        quantity: 1,
        unitAmount: usdAmount,
        currency: 'USD',
        description: input.orderName.slice(0, 127),
      },
    ],
  });

  let response: Response;
  try {
    const tossPayload =
      provider === 'overseas'
        ? {
            // PayPal 결제 (saf202719y MID): USD 환산 + FOREIGN_EASY_PAY + provider=PAYPAL
            method: 'FOREIGN_EASY_PAY',
            provider: 'PAYPAL',
            currency: 'USD',
            amount: usdAmount,
            orderId: input.orderNo,
            orderName: input.orderName,
            successUrl: input.successUrl,
            failUrl: input.failUrl,
            customerName: input.buyerName,
            customerEmail: input.buyerEmail,
            foreignEasyPay: buildForeignEasyPay(),
          }
        : {
            // 국내 결제 (saf202i818 MID): KRW + 카드/계좌이체/간편결제
            method: input.method,
            amount: input.totalAmount,
            orderId: input.orderNo,
            orderName: input.orderName,
            successUrl: input.successUrl,
            failUrl: input.failUrl,
            customerName: input.buyerName,
            customerEmail: input.buyerEmail,
            useEscrow: false,
            ...(input.easyPay ? { easyPay: input.easyPay } : {}),
          };

    response = await fetchWithTimeout(`${config.apiBaseUrl}/v1/payments`, {
      method: 'POST',
      headers: {
        Authorization: getTossAuthHeader(provider),
        'Content-Type': 'application/json',
        'Idempotency-Key': input.orderNo,
      },
      body: JSON.stringify(tossPayload),
    });
  } catch {
    return { success: false, error: apiError('payment_server_unreachable', buyerLocale) };
  }

  if (!response.ok) {
    let err: TossErrorResponse = {
      code: 'UNKNOWN',
      message: apiError('payment_session_failed', buyerLocale),
    };
    try {
      err = await response.json();
    } catch {}
    console.error(
      `[initiatePayment] Toss API error (provider=${provider}):`,
      response.status,
      JSON.stringify(err)
    );
    return {
      success: false,
      error: err.message || apiError('payment_session_failed', buyerLocale),
    };
  }

  const data = await response.json();
  // PayPal 디버깅용 로그 — Toss /v1/payments 200 응답이지만 Toss-hosted PayPal 단계에서
  // COMMON_ERROR가 발생하는 케이스. 응답 구조와 checkout URL을 기록해 원인 추적.
  if (provider === 'overseas') {
    console.error(
      `[initiatePayment] PayPal Toss response (orderId=${input.orderNo}):`,
      JSON.stringify(data).slice(0, 2000)
    );
  }
  const checkoutUrl = (data as { checkout?: { url?: string } })?.checkout?.url;
  if (!checkoutUrl) {
    console.error(
      `[initiatePayment] checkout.url missing (provider=${provider}, orderId=${input.orderNo}):`,
      JSON.stringify(data).slice(0, 2000)
    );
    return { success: false, error: apiError('checkout_url_missing', buyerLocale) };
  }

  return { success: true, checkoutUrl };
}

/**
 * 무통장 계좌이체(수동) 주문 생성.
 * Toss 결제 흐름을 거치지 않고 바로 awaiting_deposit + artwork=reserved 처리.
 * 사용자에게 우리 계좌번호를 보여주고, 관리자가 입금 확인 후 paid로 전환.
 *
 * 영문(en) 사용자에게는 노출하지 않음 — 한국 계좌이체 한정.
 */
export async function createBankTransferOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const buyerLocale: ApiLocale = input.locale === 'en' ? 'en' : 'ko';
  // 무통장은 단건/다건(장바구니) 모두 지원. createOrder가 단건(artworkId)·다건(items)을
  // 정규화해 order_items까지 INSERT하므로 여기서는 redirect용 대표 artworkId만 확정한다.
  const primaryArtworkId = input.artworkId ?? input.items?.[0]?.artworkId;
  if (!primaryArtworkId) {
    return { success: false, error: apiError('required_buyer_info', buyerLocale) };
  }
  const result = await createOrder(input);
  if (!result.success) return result;

  const adminClient = createSupabaseAdminClient();
  const dueDate = new Date(Date.now() + DEPOSIT_DEADLINE_HOURS * 60 * 60 * 1000);
  const dueDateStr = formatBankTransferDueDate(dueDate, buyerLocale);
  const bankTransferMetadata = {
    bankName: BANK_TRANSFER_INFO.bankName,
    accountNumber: BANK_TRANSFER_INFO.accountNumber,
    holderName: BANK_TRANSFER_INFO.holderName,
    dueDate: dueDateStr,
    dueDateIso: dueDate.toISOString(),
  };

  const { error: orderUpdateError } = await adminClient
    .from('orders')
    .update({
      status: 'awaiting_deposit',
      // 결제 채널 식별: Toss 거치지 않은 수동 입금. metadata에 명시
      metadata: {
        locale: buyerLocale,
        payment_provider: 'manual_bank_transfer',
        [CHECKOUT_TOKEN_HASH_KEY]: hashCheckoutToken(result.checkoutToken),
        bank_transfer: bankTransferMetadata,
      },
    })
    .eq('order_no', result.orderNo);

  if (orderUpdateError) {
    // 주문 상태 업데이트 실패 → 생성된 주문을 취소 처리
    await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', result.orderNo);
    return { success: false, error: apiError('order_state_update_failed', buyerLocale) };
  }

  // createOrder가 INSERT한 order_items를 단일 출처로 전 품목의 edition_type/status를 조회.
  // 다품목 무통장 주문에서 첫 작품만 예약하면 나머지 unique 작품이 미예약 상태로 남아
  // 이중판매가 발생한다(FIX-5).
  const { data: orderItemRows, error: orderItemsError } = await adminClient
    .from('order_items')
    .select('artwork_id, artworks(edition_type, status)')
    .eq('order_id', result.orderId);

  // 예약 중 실패 시 롤백 — 이번 주문이 이미 reserved로 바꾼 작품들을 다시 available로 되돌리고
  // 주문을 취소한다. (단건 주문은 reserved 0~1건이므로 기존과 동일한 net effect)
  const reservedSoFar: string[] = [];
  const abort = async (errorCode: ApiErrorCode): Promise<CreateOrderResult> => {
    for (const id of reservedSoFar) {
      await adminClient
        .from('artworks')
        .update({ status: 'available' })
        .eq('id', id)
        .eq('status', 'reserved');
    }
    await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', result.orderNo);
    if (reservedSoFar.length > 0) {
      revalidatePublicArtworkSurfaces();
      for (const id of reservedSoFar) {
        revalidatePath(`/artworks/${id}`);
        revalidatePath(`/en/artworks/${id}`);
      }
    }
    return { success: false, error: apiError(errorCode, buyerLocale) };
  };

  if (orderItemsError || !orderItemRows || orderItemRows.length === 0) {
    return abort('artwork_sold_out');
  }

  // 품목별 예약 — unique는 available 가드로 reserved, limited/open은 sold_out만 차단.
  const revalidateArtworkIds: string[] = [];
  for (const row of orderItemRows) {
    const artworkRel = row.artworks as
      | { edition_type: string | null; status: string | null }
      | { edition_type: string | null; status: string | null }[]
      | null;
    const artworkRow = Array.isArray(artworkRel) ? artworkRel[0] : artworkRel;
    if (!artworkRow) {
      return abort('artwork_sold_out');
    }

    if (artworkRow.edition_type === 'unique') {
      const { data: reservedArtwork, error: artworkUpdateError } = await adminClient
        .from('artworks')
        .update({ status: 'reserved' })
        .eq('id', row.artwork_id)
        .eq('status', 'available')
        .select('id');

      // error이거나 0건 matched(동시 구매로 이미 상태 변경됨) → 주문 취소 + 롤백
      if (artworkUpdateError || !reservedArtwork || reservedArtwork.length === 0) {
        return abort('artwork_sold_out');
      }
      reservedSoFar.push(row.artwork_id);
      revalidateArtworkIds.push(row.artwork_id);
    } else if (artworkRow.status !== 'available') {
      // limited/open인데 이미 sold_out(전량 판매) 상태면 구매 차단
      return abort('artwork_sold_out');
    }
  }

  // 예약된 unique 작품 상태 반영 — 다른 사용자 구매 차단
  if (revalidateArtworkIds.length > 0) {
    revalidatePublicArtworkSurfaces();
    for (const id of revalidateArtworkIds) {
      revalidatePath(`/artworks/${id}`);
      revalidatePath(`/en/artworks/${id}`);
    }
  }

  // 이메일 발송 — after(): 응답 후 실행 보장 — 알림 fetch abort 방지
  // - 구매자: virtual_account_issued 템플릿 재사용 (bankName/accountNumber/dueDate 동일 구조)
  // - 관리자: 입금 대기 알림
  after(async () => {
    try {
      const info = await getOrderNotificationInfo(adminClient, { id: result.orderId });

      const adminNotifyTask = info
        ? () =>
            notifyEmail(
              'info',
              '계좌이체 주문 접수 (입금 대기)',
              buildAdminNotificationFields(info, {
                은행: BANK_TRANSFER_INFO.bankName,
                계좌번호: BANK_TRANSFER_INFO.accountNumber,
                예금주: BANK_TRANSFER_INFO.holderName,
                입금기한: dueDateStr,
              })
            )
        : () =>
            notifyEmail('info', '계좌이체 주문 접수 (입금 대기)', {
              주문번호: result.orderNo,
              금액: `₩${result.totalAmount.toLocaleString('ko-KR')}`,
              입금기한: dueDateStr,
            });

      await runAllSettled('createBankTransferOrder.notifications', [
        adminNotifyTask,
        () =>
          sendBuyerEmail(
            input.buyerEmail.trim().toLowerCase(),
            'virtual_account_issued',
            {
              orderNo: result.orderNo,
              buyerName: input.buyerName,
              artworkTitle: info?.artworkTitle ?? '',
              artistName: info?.artistName ?? '',
              amount: result.totalAmount,
              virtualAccount: {
                bankName: bankTransferMetadata.bankName,
                accountNumber: bankTransferMetadata.accountNumber,
                dueDate: bankTransferMetadata.dueDate,
              },
            },
            buyerLocale
          ),
        () =>
          sendBuyerSms(
            input.buyerPhone,
            'virtual_account_issued',
            {
              buyerName: input.buyerName ?? '',
              artistName: info?.artistName ?? '',
              artworkTitle: info?.artworkTitle ?? '',
              amount: result.totalAmount,
              virtualAccount: {
                bankName: bankTransferMetadata.bankName,
                accountNumber: bankTransferMetadata.accountNumber,
                holderName: bankTransferMetadata.holderName,
                dueDate: bankTransferMetadata.dueDate,
              },
            },
            buyerLocale,
            result.orderNo
          ),
      ]);
    } catch (err) {
      console.error('[createBankTransferOrder] email failed:', err);
    }
  });

  // 서버 액션이 직접 success 페이지로 redirect. window.location.href 풀 리로드 대신
  // soft navigation이 일어나므로 흰 화면 깜빡임이 없고, 현재 라우트 자동 refresh로 인한
  // page.tsx reserved-guard 리다이렉트(→ 작품 상세 경유)와의 경쟁도 사라진다.
  // localePrefix: 'as-needed' — ko 기본 locale은 prefix 없음, en만 /en/.
  // 장바구니 결제는 카트 success 페이지(/checkout/success)로 — 거기서 카트 비우기 +
  // 다건 안전 랜딩(verifyBankTransferLanding + clearCartOnce) 처리. 단건은 기존 그대로 작품 상세 success.
  const successBase = input.cartCheckout
    ? '/checkout/success'
    : `/checkout/${primaryArtworkId}/success`;
  const successPath =
    buyerLocale === 'en'
      ? `/en${successBase}?method=BANK_TRANSFER&orderId=${result.orderNo}&amount=${result.totalAmount}&currency=KRW&checkoutToken=${encodeURIComponent(result.checkoutToken)}`
      : `${successBase}?method=BANK_TRANSFER&orderId=${result.orderNo}&amount=${result.totalAmount}&checkoutToken=${encodeURIComponent(result.checkoutToken)}`;
  redirect(successPath);
}

/**
 * Cancels a pending_payment order when the user abandons the payment widget.
 * Only cancels orders in 'pending_payment' status — safe to call speculatively.
 */
export async function cancelPendingOrder(orderNo: string, buyerEmail: string): Promise<void> {
  if (!orderNo || !buyerEmail) return;
  // BUG 29: rate limit — IP 기준 분당 10회
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`cancelPendingOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) return;
  const adminClient = createSupabaseAdminClient();
  await adminClient
    .from('orders')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('order_no', orderNo)
    .eq('status', 'pending_payment')
    .eq('buyer_email', buyerEmail.trim().toLowerCase());
}

/**
 * 무통장(BANK_TRANSFER) 결제 완료 안내(success) 랜딩 검증.
 *
 * Next.js 16의 미들웨어 rewrite가 default-locale 경로의 server `searchParams`를 떨구는
 * 회귀 때문에 success 페이지는 클라이언트에서 `window.location.search`로 orderId를 읽는다.
 * 임의 orderId로 SAF 브랜드 계좌 안내 화면을 위조하는 피싱을 막기 위해, 실제로
 * 입금대기/완료 상태로 존재하는 주문인지 server에서 확인한다.
 */
export async function verifyBankTransferLanding(
  orderId: string,
  checkoutToken: string
): Promise<boolean> {
  if (!orderId || typeof orderId !== 'string') return false;
  try {
    const token = checkoutToken || (await getCheckoutCookieByOrder(orderId))?.checkoutToken || '';
    const adminClient = createSupabaseAdminClient();
    const { data } = await adminClient
      .from('orders')
      .select('id, metadata')
      .eq('order_no', orderId)
      .in('status', ['awaiting_deposit', 'paid', 'preparing'])
      .maybeSingle();
    if (!data) return false;

    // 토큰 도입 전 생성된 계좌이체 주문의 재방문은 허용한다.
    const storedHash = getCheckoutTokenHash(data.metadata);
    if (!storedHash) {
      const paymentProvider =
        typeof data.metadata === 'object' && data.metadata !== null
          ? (data.metadata as Record<string, unknown>).payment_provider
          : null;
      return paymentProvider === 'manual_bank_transfer';
    }
    return isCheckoutTokenValid(data.metadata, token);
  } catch {
    return false;
  }
}

/**
 * 결제 실패/취소(fail) 랜딩에서 pending_payment 주문을 즉시 정리.
 *
 * Next.js 16 미들웨어 rewrite의 server `searchParams` 누락 회귀로 fail 페이지가
 * 클라이언트에서 `window.location.search`의 orderId를 읽어 이 액션을 호출한다.
 * `status='pending_payment'`에만 동작하므로 임의 orderId 호출은 무해
 * (최악 = 정상 진행 중인 주문 강제 취소 → 사용자가 재시도, 수익 손실 없음).
 */
export async function cancelLandingOrder(orderId: string, checkoutToken: string): Promise<void> {
  if (!orderId || typeof orderId !== 'string') return;
  const token = checkoutToken || (await getCheckoutCookieByOrder(orderId))?.checkoutToken || '';
  if (!token) return;
  const headersList = await headers();
  const ip = getClientIp(headersList);
  const rl = await rateLimit(`cancelLandingOrder:${ip}`, { limit: 10, windowMs: 60_000 });
  if (!rl.success) return;
  try {
    const adminClient = createSupabaseAdminClient();
    await adminClient
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', orderId)
      .eq('status', 'pending_payment')
      .eq(`metadata->>${CHECKOUT_TOKEN_HASH_KEY}`, hashCheckoutToken(token));
  } catch (err) {
    console.error('[cancelLandingOrder] failed:', err);
  }
}

export async function cancelLatestLandingOrder(artworkId: string): Promise<void> {
  if (!artworkId || typeof artworkId !== 'string') return;
  const latest = await getLatestCheckoutCookie(artworkId);
  if (!latest) return;
  await cancelLandingOrder(latest.orderId, latest.checkoutToken);
}
