import { SITE_URL } from '@/lib/constants';

/**
 * Instagram 단일 이미지 게시 종횡비 안전화 유틸.
 *
 * Instagram feed 이미지는 종횡비(width/height)가 **0.8(4:5 세로) ~ 1.91:1(가로)** 범위만 허용한다.
 * 이를 벗어나면 Graph API가 "The aspect ratio is not supported." 로 컨테이너 생성을 거부한다.
 * 가로/세로로 긴 작품은 1:1 흰 캔버스에 contain(letterbox) 패딩해 안전 범위로 들여보낸다.
 *
 * 판정·변환은 `/api/social/letterbox` 라우트가 sharp로 수행하고, 어댑터는 imageUrl을
 * 이 래퍼로 감싸기만 한다(분기 없음 — 허용 범위면 라우트가 원본으로 통과시킴).
 */

/** Instagram 허용 종횡비 하한(4:5 세로). */
export const IG_MIN_ASPECT_RATIO = 0.8;
/** Instagram 허용 종횡비 상한(1.91:1 가로). */
export const IG_MAX_ASPECT_RATIO = 1.91;

/** letterbox 출력 정사각 한 변(px). Instagram 권장 1080. */
export const LETTERBOX_SIZE = 1080;

/** letterbox 배경색 — 갤러리 화이트(작품 색을 왜곡하지 않는 순백 갤러리 벽). */
export const LETTERBOX_BACKGROUND = '#FFFFFF';

/**
 * 픽셀 종횡비가 Instagram 허용 범위를 벗어나 letterbox 패딩이 필요한지 판정.
 * width/height 중 하나라도 유효하지 않으면(0·음수·NaN) 안전하게 false(원본 통과).
 */
export function needsLetterbox(width: number, height: number): boolean {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return false;
  }
  const ratio = width / height;
  return ratio < IG_MIN_ASPECT_RATIO || ratio > IG_MAX_ASPECT_RATIO;
}

/**
 * Instagram에 넘길 image_url을 letterbox 라우트로 감싼다.
 * Instagram Graph가 이 URL을 fetch → 라우트가 종횡비 판정 후 원본 통과 or 1:1 패딩본 반환.
 *
 * - src가 공개 절대 https URL이 아니면(상대/빈값) 감싸지 않고 그대로 반환(라우트가 fetch 불가).
 */
export function wrapInstagramImageUrl(src: string | null | undefined): string | null {
  if (!src) return null;
  if (!/^https?:\/\//.test(src)) return src;
  return `${SITE_URL}/api/social/letterbox?src=${encodeURIComponent(src)}`;
}
