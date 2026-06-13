import { resolveArtworkImageUrlForPreset, resolveOptimizedArtworkImageUrl } from '@/lib/utils';

/**
 * Hero 배경 이미지의 mobile / desktop 1x / desktop 2x URL을 일괄 발급.
 *
 * 단일 출처(SSoT) — PageHero 자동 preload와 PageHeroBackground picture/srcSet이
 * 같은 URL을 가리키도록 보장. 이 helper를 거치지 않고 따로 계산하면 preload된
 * 자원과 picture가 선택하는 자원이 어긋나(preload 무효) LCP 손해.
 *
 * 분기 정책 (PageHeroBackground와 동일):
 * - mobile (<768px): mobile preset = 600w / quality 72 (full-viewport hero에 400w는 과소)
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
    // 로컬 자산(/images/...)도 Vercel Image Optimization을 경유시킨다 (2026-06-12 감사).
    // 원본 JPG(hero 16.jpg 1.0MB 등)를 무변환·무리사이즈로 모바일까지 내려보내 핵심 랜딩
    // 페이지(about/our-reality/our-proof/archive)의 LCP를 망치던 회귀. w 값은
    // next.config.js deviceSizes(828/1200/1920), q=60은 qualities의 hero 전용 등록값.
    const encoded = encodeURIComponent(customImage);
    return {
      mobile: `/_next/image?url=${encoded}&w=828&q=60`,
      desktop1x: `/_next/image?url=${encoded}&w=1200&q=60`,
      desktop2x: `/_next/image?url=${encoded}&w=1920&q=60`,
    };
  }

  return {
    // full-viewport hero의 모바일 분기 — slider(400w)는 과소해 업스케일 블러 + DPR 미스매치.
    // 600w/q72 mobile preset 사용 (2026-06-12 감사).
    mobile: resolveArtworkImageUrlForPreset(customImage, 'mobile'),
    desktop1x: resolveOptimizedArtworkImageUrl(customImage, { width: 1200, quality: 80 }),
    desktop2x: resolveOptimizedArtworkImageUrl(customImage, { width: 1920, quality: 80 }),
  };
}
