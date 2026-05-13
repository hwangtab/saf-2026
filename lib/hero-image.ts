import { resolveArtworkImageUrlForPreset, resolveOptimizedArtworkImageUrl } from '@/lib/utils';

/**
 * Hero 배경 이미지의 mobile / desktop 1x / desktop 2x URL을 일괄 발급.
 *
 * 단일 출처(SSoT) — PageHero 자동 preload와 PageHeroBackground picture/srcSet이
 * 같은 URL을 가리키도록 보장. 이 helper를 거치지 않고 따로 계산하면 preload된
 * 자원과 picture가 선택하는 자원이 어긋나(preload 무효) LCP 손해.
 *
 * 분기 정책 (PageHeroBackground와 동일):
 * - mobile (<768px): slider preset = 400w / quality 75
 * - desktop 1x (≥768px, non-Retina): 1200w / quality 80
 * - desktop 2x (≥768px, Retina): 1920w / quality 80
 */
export interface HeroImageUrls {
  mobile: string;
  desktop1x: string;
  desktop2x: string;
}

export function getHeroImageUrls(customImage: string | null | undefined): HeroImageUrls | null {
  if (!customImage) return null;
  const isRemote = customImage.startsWith('http');

  if (!isRemote) {
    // 로컬 자산(/images/...). 단일 URL을 mobile/desktop 모두에 사용 — 변환 안 함.
    return { mobile: customImage, desktop1x: customImage, desktop2x: customImage };
  }

  return {
    mobile: resolveArtworkImageUrlForPreset(customImage, 'slider'),
    desktop1x: resolveOptimizedArtworkImageUrl(customImage, { width: 1200, quality: 80 }),
    desktop2x: resolveOptimizedArtworkImageUrl(customImage, { width: 1920, quality: 80 }),
  };
}
