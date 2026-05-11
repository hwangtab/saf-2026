import HeroSpotlightStatic from './HeroSpotlightStatic';
import HeroSpotlightCarouselLazy from './HeroSpotlightCarouselLazy';
import type { SpotlightSlide } from './HeroSpotlight.types';

export type { SpotlightSlide };

interface HeroSpotlightProps {
  slides: SpotlightSlide[];
}

/**
 * HeroSpotlight orchestrator (server component).
 *
 * 세 컴포넌트로 분리:
 * 1. HeroSpotlight (server, this file) — 두 island를 조립
 * 2. HeroSpotlightStatic (server) — 첫 슬라이드 server-rendered HTML, LCP element
 * 3. HeroSpotlightCarouselLazy → HeroSpotlightCarousel (client, ssr:false dynamic) —
 *    embla carousel + autoplay. SSR HTML 출력 없이 hydration 후 mount.
 *
 * PSI 진단 (모바일 saf2026.com 메인):
 *   LCP 4.1~5.2s (Poor). element render delay 907~943ms 일관 — 캐시·서버와 무관.
 *   주범: 기존 HeroSpotlight 전체가 'use client'. embla-carousel-react + Autoplay 번들이
 *   페이지 메인 client chunk에 합쳐져 다운로드/파싱/실행이 main thread를 점유하며 LCP
 *   이미지 paint를 뒤로 밀음.
 *
 * 본 분리 후 기대 효과:
 *   - LCP 이미지가 server-rendered island(HeroSpotlightStatic) 단독으로 paint — DOM에
 *     carousel 마크업 부재 → hydration·번들 다운로드와 무관하게 paint
 *   - carousel JS chunk는 ssr:false dynamic으로 page bundle에서 완전 분리 → LCP paint 전
 *     main thread 점유 0
 *   - element render delay ~900ms → ~200ms 이하 기대
 *
 * 트레이드오프:
 *   - carousel mount 시점에 absolute 레이어가 static을 덮어씀. 동일 이미지·동일 텍스트라
 *     시각 변화 거의 없으나, 짧은 1프레임 동안 h1이 DOM에 2개 존재 (semantically OK,
 *     screen reader는 carousel 마운트 후엔 carousel h1을 우선 인식).
 *   - 슬라이드가 1개뿐이면 carousel 인디케이터가 안 뜨므로 carousel mount의 시각 효과 0.
 *     이 경우 정적 화면 그대로가 인터랙티브하지 않지만, 단일 슬라이드 경로는 비활성도 무방.
 *   - JS 비활성 환경(검색엔진 크롤러 일부, 접근성 도구)에서는 첫 슬라이드만 보임. SEO
 *     영향 거의 없음 (Googlebot은 JS 렌더 지원, 첫 슬라이드 h1·텍스트·링크 정상 노출).
 */
export default function HeroSpotlight({ slides }: HeroSpotlightProps) {
  if (slides.length === 0) return null;

  const firstSlide = slides[0];

  return (
    <section aria-label="Spotlight" className="relative isolate overflow-hidden bg-charcoal-deep">
      {/* Server-rendered LCP island — hydration 전 즉시 paint */}
      <HeroSpotlightStatic slide={firstSlide} />

      {/* Client carousel — mount되면 absolute 레이어로 위에 덮어쓰며 인터랙션 활성화.
          static과 동일한 SlideCard 마크업이라 시각 동일. ssr:false dynamic으로 SSR HTML
          미출력 → LCP element 후보 단일화. */}
      <div className="absolute inset-0">
        <HeroSpotlightCarouselLazy slides={slides} />
      </div>
    </section>
  );
}
