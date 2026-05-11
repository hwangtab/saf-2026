'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import type { SpotlightSlide } from './HeroSpotlight.types';

interface HeroSpotlightCarouselProps {
  slides: SpotlightSlide[];
}

/**
 * HeroSpotlight client island — embla carousel + autoplay + 인디케이터/화살표.
 *
 * server-rendered HeroSpotlightStatic 첫 슬라이드 위에 absolute로 mount되어,
 * hydration이 끝나는 즉시 활성화. 시각적으로 동일한 마크업이므로 깜박임 없음
 * (동일 image src → next/image 캐시 hit, 동일 텍스트/레이아웃).
 *
 * 분리 배경: PSI 모바일 LCP element render delay 907~943ms (캐시·서버와 무관 일관).
 * 기존 HeroSpotlight 전체가 client 였기 때문에 embla + Autoplay JS 다운로드/파싱/실행이
 * 첫 paint를 지연. 첫 슬라이드를 server island로 분리해 LCP는 hydration 전 paint.
 *
 * 이 컴포넌트는 동적 import (`next/dynamic`) 대상 — bundle splitting으로 LCP path에서
 * carousel JS를 제거. 부모(HeroSpotlight server component)에서 ssr:false 또는
 * Suspense 없이 dynamic으로 호출. SSR 마크업은 HeroSpotlightStatic이 책임지므로
 * carousel 자체는 client-only로 안전.
 */
export default function HeroSpotlightCarousel({ slides }: HeroSpotlightCarouselProps) {
  const t = useTranslations('home.nowShowing');

  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: 'start' }, [
    Autoplay({
      delay: 6000,
      stopOnInteraction: false,
      stopOnMouseEnter: true,
      stopOnFocusIn: true,
    }),
  ]);

  const [selectedIndex, setSelectedIndex] = useState(0);
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([]);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    setScrollSnaps(emblaApi.scrollSnapList());
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    onSelect();
  }, [emblaApi, onSelect]);

  return (
    <section aria-label="Spotlight carousel" className="relative overflow-hidden bg-charcoal-deep">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, idx) => (
            <SlideCard key={slide.slug} slide={slide} priority={idx === 0} />
          ))}
        </div>
      </div>

      {/* 점 인디케이터 — 하단 중앙 */}
      {scrollSnaps.length > 1 && (
        <div className="absolute bottom-12 md:bottom-16 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {scrollSnaps.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => scrollTo(idx)}
                aria-label={t('goToSlide', { n: idx + 1 })}
                aria-current={idx === selectedIndex ? 'true' : 'false'}
                // 터치 영역 24x24px 확보(WCAG 2.5.5 / PSI a11y 권장) — 시각 dot은
                // inner span으로 분리해 디자인 톤(8px) 유지. button 자체는 투명 hit area.
                className="group relative inline-flex h-6 w-6 items-center justify-center rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-charcoal-deep"
              >
                <span
                  aria-hidden="true"
                  className={`block h-2 rounded-full transition-all duration-300 ${
                    idx === selectedIndex
                      ? 'w-8 bg-white'
                      : 'w-2 bg-white/40 group-hover:bg-white/60'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 좌우 화살표 — 데스크톱만 (호버 시 진하게) */}
      {scrollSnaps.length > 1 && (
        <>
          <button
            type="button"
            onClick={scrollPrev}
            aria-label={t('prevSlide')}
            className="hidden md:flex absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronLeft aria-hidden="true" className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={scrollNext}
            aria-label={t('nextSlide')}
            className="hidden md:flex absolute right-4 lg:right-6 top-1/2 -translate-y-1/2 z-20 h-12 w-12 items-center justify-center rounded-full bg-black/30 hover:bg-black/60 backdrop-blur-sm text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <ChevronRight aria-hidden="true" className="h-6 w-6" />
          </button>
        </>
      )}
    </section>
  );
}

function SlideCard({ slide, priority }: { slide: SpotlightSlide; priority: boolean }) {
  const inner = (
    <div className="relative min-h-[70svh] md:min-h-[85svh] w-full overflow-hidden">
      {/* priority=true(첫 슬라이드): HeroSpotlightStatic이 이미 server-rendered + priority
          fetch로 LCP 이미지를 가져왔으므로, carousel mount 시점엔 동일 src가 next/image
          캐시 hit. fetchPriority="high"는 그대로 유지 (브라우저 hint 일관성). */}
      <SafeImage
        src={slide.imageUrl}
        alt={slide.title}
        fill
        priority={priority}
        fetchPriority={priority ? 'high' : 'auto'}
        quality={60}
        sizes="100vw"
        className="object-cover"
      />

      {/* 다크 그라디언트 — 텍스트 가독성 */}
      <div className="absolute inset-0 bg-gradient-to-t from-charcoal-deep/90 via-charcoal-deep/45 to-charcoal-deep/25" />

      {/* 텍스트 블록 — 중앙 정렬, hero 톤 */}
      <div className="relative z-10 flex h-full min-h-[70svh] md:min-h-[85svh] flex-col items-center justify-center px-4 pt-24 pb-32 md:pb-40 text-center text-white">
        <span
          className={`mb-5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold tracking-wide uppercase ${
            slide.state === 'on'
              ? 'bg-success/90 text-white'
              : 'bg-white/15 text-white backdrop-blur-sm'
          }`}
        >
          {slide.state === 'on' && (
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
            </span>
          )}
          {slide.status}
        </span>
        {/* h1은 HeroSpotlightStatic(server)이 이미 LCP island로 출력. carousel mount 후
            첫 슬라이드는 carousel이 위를 덮으면서 사용자에게 보이는 h1이 carousel의
            첫 슬라이드 h1으로 자연 교체됨 — 시각 동일 + DOM 중복 1프레임. h2로 두면
            outline 회귀(홈에 h1 0개) 발생하므로 carousel도 h1 유지. */}
        <h1 className="text-hero text-white mb-5 drop-shadow-lg break-keep text-balance max-w-4xl">
          {slide.title}
        </h1>
        <p className="text-body-large text-white/90 mb-8 max-w-2xl break-keep text-balance">
          {slide.desc}
        </p>
        <span
          className={`inline-flex items-center gap-2 rounded-lg border-2 border-white/80 px-7 py-3 text-base md:text-lg font-bold backdrop-blur-sm transition-colors ${
            slide.href ? 'bg-white/10 hover:bg-white hover:text-charcoal-deep' : 'bg-white/5'
          }`}
        >
          {slide.cta}
          <ArrowRight aria-hidden="true" className="h-5 w-5" />
        </span>
      </div>
    </div>
  );

  // embla 슬라이드: flex-[0_0_100%] + min-w-0 필수
  const slideClass = 'flex-[0_0_100%] min-w-0';

  if (slide.href) {
    return (
      <Link href={slide.href} className={`${slideClass} block group`}>
        {inner}
      </Link>
    );
  }
  return <div className={`${slideClass} cursor-not-allowed`}>{inner}</div>;
}
