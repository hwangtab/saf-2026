'use client';

import dynamic from 'next/dynamic';
import type { SpotlightSlide } from './HeroSpotlight.types';

/**
 * Client-only wrapper로 HeroSpotlightCarousel을 lazy load.
 *
 * Next.js 16 server component에서는 `dynamic(..., { ssr: false })`가 차단됨.
 * 그래서 client component에서 한 단계 wrap하고 그 안에서 ssr:false dynamic 호출.
 *
 * 효과:
 *   1. carousel SSR HTML이 페이지 마크업에 출력되지 않음 → LCP path에 carousel 마크업 부재
 *   2. carousel JS chunk는 hydration 시점 이후 lazy load → LCP paint 전 main thread 점유 0
 *
 * 첫 슬라이드 정적 마크업은 HeroSpotlightStatic이 server에서 출력하므로 사용자는 즉시
 * 시각 콘텐츠를 봄. carousel은 mount되면 absolute 레이어로 static 위에 덮어쓰며 인터랙션
 * 활성화.
 *
 * Suspense/loading fallback 없음 — static이 그 자리를 채우고 있으므로 fallback을 두면
 * 오히려 정적 마크업을 가리는 회귀 위험.
 */
const HeroSpotlightCarousel = dynamic(() => import('./HeroSpotlightCarousel'), {
  ssr: false,
});

export default function HeroSpotlightCarouselLazy({ slides }: { slides: SpotlightSlide[] }) {
  return <HeroSpotlightCarousel slides={slides} />;
}
