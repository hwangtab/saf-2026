/**
 * 다품목(cart) 주문의 "대표 작품" 표시를 만드는 읽기 경로 헬퍼.
 *
 * 배경: cart 주문은 `orders.artwork_id`가 NULL이고 실제 품목은 `order_items`에 있다.
 * 단건 artwork_id 조인만 읽던 화면(주문조회·admin 대시보드)은 다품목 주문에서 제목/이미지/
 * 작가가 빈 값으로 떨어진다. order_items 임베드를 정규화해 "대표작품(첫 품목) + 외 N건"으로
 * 표시한다. `lib/utils/get-order-notification-info.ts`(이메일/알림)의 해석과 동일한 규칙.
 *
 * Supabase 임베드는 1:N이라 배열이 기본이지만, 추론/엣지에서 객체·null로도 올 수 있어
 * unknown으로 받아 방어적으로 정규화한다.
 */

export type RepresentativeArtwork = {
  /** 첫 품목 작품 제목 (없으면 null) */
  title: string | null;
  /** 첫 품목 작품 id (작품 상세 링크용, select에 id 포함됐을 때만; 없으면 null) */
  artworkId: string | null;
  /** 첫 품목 첫 이미지 (없으면 null) */
  image: string | null;
  /** 첫 품목 작가명(name_ko) (없으면 null) */
  artistName: string | null;
  /** order_items 총 라인 수 (다품목 판정·"외 N건" 계산용) */
  count: number;
};

function firstOrSelf<T>(value: unknown): T | null {
  if (Array.isArray(value)) return (value[0] as T | undefined) ?? null;
  return (value as T | null) ?? null;
}

function extractArtistName(artists: unknown): string | null {
  const artist = firstOrSelf<{ name_ko?: string | null }>(artists);
  return artist?.name_ko ?? null;
}

/**
 * order_items 임베드(unknown)에서 대표 작품 정보를 추출한다.
 * 품목이 없으면 count=0, 나머지 필드 null — 호출자는 기존 artworks fallback으로 분기.
 *
 * @param orderItems - `order_items(... artworks(title, images, artists(name_ko)))` 임베드.
 *   배열/객체/null 모두 허용. images는 select에 포함됐을 때만 채워짐.
 */
export function getRepresentativeArtwork(orderItems: unknown): RepresentativeArtwork {
  const arr: unknown[] = Array.isArray(orderItems)
    ? orderItems
    : orderItems != null
      ? [orderItems]
      : [];

  if (arr.length === 0) {
    return { title: null, artworkId: null, image: null, artistName: null, count: 0 };
  }

  const firstArtwork = firstOrSelf<{
    id?: string | null;
    title?: string | null;
    images?: string[] | null;
    artists?: unknown;
  }>((arr[0] as { artworks?: unknown }).artworks);

  const images = Array.isArray(firstArtwork?.images) ? firstArtwork?.images : [];

  return {
    title: firstArtwork?.title ?? null,
    artworkId: firstArtwork?.id ?? null,
    image: images && images.length > 0 ? images[0] : null,
    artistName: extractArtistName(firstArtwork?.artists),
    count: arr.length,
  };
}

/**
 * 대표 제목 + "외 N건" 라벨을 locale에 맞춰 만든다.
 * 단건(count<=1)이면 "외" 없이 제목 그대로. get-order-notification-info와 동일한 문구.
 *
 * @param title - 대표 작품 제목
 * @param count - order_items 라인 수
 * @param locale - 'ko' | 'en'
 */
export function formatRepresentativeTitle(
  title: string,
  count: number,
  locale: 'ko' | 'en'
): string {
  if (count <= 1) return title;
  const rest = count - 1;
  return locale === 'en' ? `${title} and ${rest} more` : `${title} 외 ${rest}건`;
}
