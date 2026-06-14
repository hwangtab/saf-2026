import type { SupabaseClient } from '@supabase/supabase-js';

import type { EmailLocale } from '@/emails/_components/i18n';

/**
 * 결제/배송 알림(notifyEmail, sendBuyerEmail) 양쪽에서 사용하는 주문 컨텍스트.
 * 한 번의 join 쿼리로 orders + artworks + artists 정보를 묶어서 반환한다.
 *
 * 누락된 컬럼은 빈 문자열/0으로 채워서 호출지가 옵셔널 체크 없이 그대로 사용 가능하게 함.
 * 실패 시 null 반환 — 알림 발송이 막히면 안 되므로 호출지에서 fallback.
 */
export interface OrderNotificationInfo {
  orderId: string;
  orderNo: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingName: string;
  shippingPhone: string;
  shippingAddress: string;
  shippingMemo: string;
  artworkTitle: string;
  artistName: string;
  itemAmount: number;
  shippingAmount: number;
  totalAmount: number;
  locale: EmailLocale;
}

type Lookup = { id: string } | { orderNo: string };

export async function getOrderNotificationInfo(
  supabase: SupabaseClient,
  lookup: Lookup
): Promise<OrderNotificationInfo | null> {
  const query = supabase
    .from('orders')
    .select(
      `
        id, order_no,
        buyer_name, buyer_email, buyer_phone,
        shipping_name, shipping_phone, shipping_address, shipping_address_detail, shipping_memo,
        item_amount, shipping_amount, total_amount,
        metadata,
        artworks(title, artists(name_ko)),
        order_items(artworks(title, artists(name_ko)))
      `
    )
    .limit(1);

  const filtered =
    'id' in lookup ? query.eq('id', lookup.id) : query.eq('order_no', lookup.orderNo);

  const { data, error } = await filtered.maybeSingle();
  if (error || !data) return null;

  const metaLocale = (data.metadata as Record<string, unknown> | null)?.locale;
  const locale: EmailLocale = metaLocale === 'en' ? 'en' : 'ko';

  // order_items 우선 해석 — 다품목 주문 대응
  // Supabase 임베드는 배열/객체 양쪽 가능 → unknown으로 받아 정규화
  type OrderItemNormalized = {
    artworks: {
      title?: string;
      artists?: { name_ko?: string } | Array<{ name_ko?: string }> | null;
    } | null;
  };
  const orderItemsRaw: unknown = data.order_items;
  const orderItemsArr: unknown[] = Array.isArray(orderItemsRaw)
    ? orderItemsRaw
    : orderItemsRaw != null
      ? [orderItemsRaw]
      : [];
  // 각 item의 artworks도 배열/객체 양쪽 정규화
  const orderItems: OrderItemNormalized[] = orderItemsArr.map((item) => {
    const it = item as { artworks?: unknown };
    const aw = Array.isArray(it.artworks) ? it.artworks[0] : it.artworks;
    return { artworks: (aw as OrderItemNormalized['artworks']) ?? null };
  });

  let artworkTitle: string;
  let artistName: string;

  if (orderItems.length > 0) {
    // order_items 기반 해석 (artworks는 이미 정규화된 단일 객체)
    const repArtwork = orderItems[0].artworks;
    const repTitle = repArtwork?.title ?? '';

    const repArtistsRaw = repArtwork?.artists;
    artistName = Array.isArray(repArtistsRaw)
      ? (repArtistsRaw[0]?.name_ko ?? '')
      : ((repArtistsRaw as { name_ko?: string } | null | undefined)?.name_ko ?? '');

    if (orderItems.length >= 2) {
      const rest = orderItems.length - 1;
      // 다품목 요약 라벨. admin 알림(한국어 전용)·구매자 이메일(locale) 공용이라 여기서 직접
      // locale 분기. 구매자 이메일 카피 변경 시 messages/*.json이 아닌 이 줄을 함께 확인할 것.
      artworkTitle = locale === 'en' ? `${repTitle} and ${rest} more` : `${repTitle} 외 ${rest}건`;
    } else {
      artworkTitle = repTitle;
    }
  } else {
    // fallback: 기존 artworks join (단건 artwork_id 기반 주문)
    const artworkRow = Array.isArray(data.artworks) ? data.artworks[0] : data.artworks;
    const artistsRaw = artworkRow?.artists;
    artistName = Array.isArray(artistsRaw)
      ? (artistsRaw[0]?.name_ko ?? '')
      : ((artistsRaw as { name_ko?: string } | null | undefined)?.name_ko ?? '');
    artworkTitle = artworkRow?.title ?? '';
  }

  const addressFull = [data.shipping_address, data.shipping_address_detail]
    .filter((s): s is string => !!s && s.trim().length > 0)
    .join(' ');

  return {
    orderId: data.id,
    orderNo: data.order_no ?? '',
    buyerName: data.buyer_name ?? '',
    buyerEmail: data.buyer_email ?? '',
    buyerPhone: data.buyer_phone ?? '',
    shippingName: data.shipping_name ?? '',
    shippingPhone: data.shipping_phone ?? '',
    shippingAddress: addressFull,
    shippingMemo: data.shipping_memo ?? '',
    artworkTitle,
    artistName,
    itemAmount: data.item_amount ?? 0,
    shippingAmount: data.shipping_amount ?? 0,
    totalAmount: data.total_amount ?? 0,
    locale,
  };
}

/**
 * 관리자 알림용 필드 맵 — notifyEmail의 fields 인자에 그대로 spread 가능.
 * 빈 값은 누락(undefined로 빠지지 않도록 — '미입력'으로 표시).
 *
 * @param info - getOrderNotificationInfo 결과
 * @param extras - 알림별 추가 필드 (결제수단, 환불금액 등)
 */
export function buildAdminNotificationFields(
  info: OrderNotificationInfo,
  extras: Record<string, string | number | undefined> = {}
): Record<string, string> {
  const fields: Record<string, string> = {
    주문번호: info.orderNo,
    구매자: info.buyerName || '미입력',
    이메일: info.buyerEmail || '미입력',
    전화: info.buyerPhone || '미입력',
    작품: info.artworkTitle || '미상',
    작가: info.artistName || '미상',
    상품가: `₩${info.itemAmount.toLocaleString('ko-KR')}`,
    배송료: `₩${info.shippingAmount.toLocaleString('ko-KR')}`,
    결제금액: `₩${info.totalAmount.toLocaleString('ko-KR')}`,
    수령인: info.shippingName || '미입력',
    수령인연락처: info.shippingPhone || '미입력',
    배송지: info.shippingAddress || '미입력',
  };

  if (info.shippingMemo) {
    fields['배송메모'] = info.shippingMemo;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (siteUrl) {
    fields['관리자페이지'] = `${siteUrl}/admin/orders/${info.orderId}`;
  }

  for (const [key, value] of Object.entries(extras)) {
    if (value === undefined || value === null || value === '') continue;
    fields[key] = typeof value === 'number' ? value.toLocaleString('ko-KR') : value;
  }

  return fields;
}
