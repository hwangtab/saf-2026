import { getTranslations } from 'next-intl/server';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import HeroSpotlightSlideCard, {
  type SpotlightSlide,
} from '@/components/features/HeroSpotlightSlideCard';
import HeroSpotlightEnhancer from '@/components/features/HeroSpotlightEnhancer';

export type { SpotlightSlide };

interface HeroSpotlightProps {
  slides: SpotlightSlide[];
  /** force-static 환경에서 server sub-component에 명시 전달 필수
   *  (next-intl 가이드 + 메모리: i18n force-static locale 명시 전달) */
  locale: string;
}

/**
 * 메인 hero 슬라이더 — Saatchi 스타일. **Progressive Enhancement 패턴**.
 *
 * Server Component로 모든 슬라이드/dots/arrows의 정적 마크업을 SSR HTML에 박아
 * 첫 paint에서 첫 슬라이드 LCP element가 표시됨. `<HeroSpotlightEnhancer/>`
 * client island가 useEffect에서 vanilla embla를 마운트해 같은 DOM에 슬라이드
 * 동작/autoplay/handler를 부여.
 *
 * **회귀 trauma 회피 핵심**:
 * - DOM 노드 교체 없음 → 두 번째 paint LCP 회귀(commit 4378e1a4) 회피
 * - embla mount이 useEffect에서 정상 실행 → idleCallback 폭증(commit a3e6d876) 회피
 *
 * 1번 슬라이드는 항상 'all-artworks'(구매 본업, 전체 작품 페이지 직결).
 * 그 외 슬라이드는 lib/now-showing.ts의 시한성 큐레이션.
 *
 * - autoplay 6초, 호버·포커스 시 일시정지 (enhancer가 마운트된 후부터)
 * - 점 인디케이터(하단 중앙) + 좌우 화살표(데스크톱 호버 시)
 * - 비활성 슬라이드(status=coming-soon, href=null)는 클릭 비활성
 */
export default async function HeroSpotlight({ slides, locale }: HeroSpotlightProps) {
  const t = await getTranslations({ locale, namespace: 'home.nowShowing' });
  const showCarouselControls = slides.length > 1;

  return (
    <section
      data-hero-spotlight
      aria-label="Spotlight carousel"
      className="relative overflow-hidden bg-charcoal-deep"
    >
      <div data-embla-viewport className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, idx) => (
            <HeroSpotlightSlideCard key={slide.slug} slide={slide} priority={idx === 0} />
          ))}
        </div>
      </div>

      {/* 점 인디케이터 — 하단 중앙.
          enhancer가 마운트되기 전에도 SSR된 첫 dot이 active 상태로 렌더되어
          시각 점프 없음. enhancer가 select 이벤트에 따라 aria-current와 indicator
          span classList를 mutate. */}
      {showCarouselControls && (
        <div className="absolute bottom-12 md:bottom-16 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {slides.map((slide, idx) => {
              const isActive = idx === 0;
              return (
                <button
                  key={slide.slug}
                  type="button"
                  data-embla-dot
                  aria-label={t('goToSlide', { n: idx + 1 })}
                  aria-current={isActive ? 'true' : 'false'}
                  // 터치 영역 24x24px 확보(WCAG 2.5.5 / PSI a11y 권장) — 시각 dot은
                  // inner span으로 분리해 디자인 톤(8px) 유지. button 자체는 투명 hit area.
                  className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-deep"
                >
                  <span
                    aria-hidden="true"
                    data-embla-dot-indicator
                    className={`block h-2 rounded-full transition-all duration-300 ${
                      isActive ? 'w-8 bg-white' : 'w-2 bg-white/40 group-hover:bg-white/60'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 좌우 화살표 — 데스크톱만 (호버 시 진하게). enhancer가 마운트되기 전에는
          버튼이 클릭 가능해도 no-op이라 사용자 인터랙션 누락 없음. */}
      {showCarouselControls && (
        <>
          <button
            type="button"
            data-embla-prev
            aria-label={t('prevSlide')}
            className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            data-embla-next
            aria-label={t('nextSlide')}
            className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
        </>
      )}

      <HeroSpotlightEnhancer slideCount={slides.length} />
    </section>
  );
}
