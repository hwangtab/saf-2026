import { SITE_URL } from '@/lib/constants';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';

/**
 * 작품 이미지 참조(`artworks.images[0]`)를 소셜 API가 가져갈 수 있는 **공개 절대 URL**로 변환.
 *
 * - 이미 http(s) 절대 URL이면 그대로 사용 (Supabase Storage 공개 object URL 등)
 * - 사이트 루트 상대 경로(`/images/...`)면 `SITE_URL`을 붙여 절대화
 * - bare 파일명(legacy)은 `resolveArtworkImageUrl`이 OG 플레이스홀더 경로로 매핑 → 절대화
 * - 빈 값/null이면 null
 *
 * Instagram은 JPEG를 권장하지만 포맷 변환은 하지 않는다(원본 URL 전달). 비-JPEG로 API가
 * 거부하면 어댑터가 에러를 그대로 노출한다.
 */
export function resolvePublicImageUrl(image: string | null | undefined): string | null {
  if (!image) return null;
  const resolved = resolveArtworkImageUrl(image);
  if (!resolved) return null;

  if (resolved.startsWith('https://')) return resolved;
  // 소셜 플랫폼은 http 이미지를 거부하므로 https로 승격 시도
  if (resolved.startsWith('http://')) return `https://${resolved.slice('http://'.length)}`;
  if (resolved.startsWith('/')) return `${SITE_URL}${resolved}`;

  // bare 파일명 등 절대화 불가
  return null;
}

/** 작품 상세 페이지 공개 URL (캡션 링크용). */
export function artworkPublicUrl(artworkId: string, locale: 'ko' | 'en' = 'ko'): string {
  return `${SITE_URL}/${locale}/artworks/${artworkId}`;
}
