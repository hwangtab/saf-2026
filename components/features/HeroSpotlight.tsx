'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';

export interface SpotlightSlide {
  slug: string;
  href: string | null;
  imageUrl: string;
  status: string;
  title: string;
  desc: string;
  cta: string;
  /** 'on' | 'coming-soon' — 배지 색상 분기 */
  state: 'on' | 'coming-soon';
}

interface HeroSpotlightProps {
  slides: SpotlightSlide[];
}

/**
 * 메인 hero 슬라이더 — Saatchi 스타일.
 * 1번 슬라이드는 항상 'all-artworks'(구매 본업, 전체 작품 페이지 직결).
 * 그 외 슬라이드는 lib/now-showing.ts의 시한성 큐레이션.
 *
 * - autoplay 6초, 호버·포커스 시 일시정지
 * - 점 인디케이터(하단 중앙) + 좌우 화살표(데스크톱 호버 시)
 * - 비활성 슬라이드(status=coming-soon, href=null)는 클릭 비활성
 *
 * RSC 제약: 함수 props는 server → client 전달 불가하므로 a11y 라벨은
 * 컴포넌트 내부에서 useTranslations로 직접 처리. 슬라이드 콘텐츠(title/desc 등)는
 * server에서 미리 풀어 SSR HTML에 정적 노출 → SEO 유지.
 *
 * ── LCP lazy-hydration 전략 (2026-05-11) ─────────────────────────────────────
 * 기존: 컴포넌트 hydrate 즉시 embla `active:true`로 init →
 *   translate/resize/dragHandler/slidesHandler init이 main thread를 점유,
 *   PSI element render delay 907~943ms 일관 → mobile LCP 5.1s.
 *
 * 신: embla를 `active:false`로 초기 init → SSR DOM 그대로 유지(transform 없음,
 *   ref 등록만), LCP paint 완료 후 idle 시점에 `reInit({ active:true })` 호출 →
 *   embla 정상 활성화. 동일 DOM 트리에서 transform만 박히므로 *두 번째 paint
 *   가 일어나지 않음* — 4378e1a4 회귀 패턴(server static + client absolute
 *   overlay = 두 paint 충돌)을 구조적으로 회피.
 *
 *   첫 슬라이드 translate3d(0,0,0)이라 활성화 순간 위치 변화 0. 인디케이터/
 *   화살표는 slides.length 기반으로 SSR/CSR 모두 일관 렌더(scrollSnaps 의존
 *   제거) — DOM mount 후 추가되는 절대 위치 노드 없음. LCP element는 단일
 *   <img>로 시작해 끝까지 동일 노드.
 */
export default function HeroSpotlight({ slides }: HeroSpotlightProps) {
  const t = useTranslations('home.nowShowing');

  // embla 활성 여부. 초기 false → SSR DOM과 hydration 결과가 비트 단위로 동일
  // (translate transform 없음, drag/resize listener 없음). LCP paint 후 idle에 true 전환.
  const [emblaActive, setEmblaActive] = useState(false);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    { loop: true, align: 'start', active: emblaActive },
    [
      Autoplay({
        delay: 6000,
        stopOnInteraction: false,
        stopOnMouseEnter: true,
        stopOnFocusIn: true,
      }),
    ]
  );

  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollTo = useCallback((index: number) => emblaApi?.scrollTo(index), [emblaApi]);
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  // embla 이벤트 구독 — active 토글 시점에 emblaApi 재생성되지 않고 reactivate되므로
  // 동일 emblaApi에 대해 'select'/'reInit' 핸들러를 한 번 등록하면 충분.
  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on('select', onSelect);
    emblaApi.on('reInit', onSelect);
    return () => {
      emblaApi.off('select', onSelect);
      emblaApi.off('reInit', onSelect);
    };
  }, [emblaApi, onSelect]);

  // LCP 보호용 lazy hydration: hydrate 후 idle 시점에 embla 활성화.
  // requestIdleCallback이 없는 환경(Safari < 17)에서는 setTimeout fallback.
  // 단일 슬라이드면 carousel 동작 자체가 의미 없으므로 활성화 생략 (DOM 변경 0).
  useEffect(() => {
    if (slides.length <= 1) return;

    let cancelled = false;
    const activate = () => {
      if (cancelled) return;
      setEmblaActive(true);
    };

    type RIC = (cb: () => void, opts?: { timeout?: number }) => number;
    const ric: RIC | undefined = (window as unknown as { requestIdleCallback?: RIC })
      .requestIdleCallback;
    if (typeof ric === 'function') {
      const handle = ric(activate, { timeout: 2000 });
      return () => {
        cancelled = true;
        const cic = (window as unknown as { cancelIdleCallback?: (h: number) => void })
          .cancelIdleCallback;
        if (typeof cic === 'function') cic(handle);
      };
    }
    // Fallback: 1프레임 + 500ms — LCP 측정 종료(보통 ~2.5s 이내) 이후 활성화
    const tid = window.setTimeout(activate, 500);
    return () => {
      cancelled = true;
      window.clearTimeout(tid);
    };
  }, [slides.length]);

  // 인디케이터/화살표 표시 여부는 slides.length로 직접 판정 — SSR/CSR 일관.
  // 기존 scrollSnaps.length 기반은 emblaApi mount 후 setState로 추가 렌더링되어
  // 절대 위치 노드가 paint 1프레임 뒤에 들어가는 미세 layout 변화 유발.
  const hasMultipleSlides = slides.length > 1;

  return (
    <section aria-label="Spotlight carousel" className="relative overflow-hidden bg-charcoal-deep">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide, idx) => (
            <SlideCard key={slide.slug} slide={slide} priority={idx === 0} />
          ))}
        </div>
      </div>

      {/* 점 인디케이터 — 하단 중앙. SSR/CSR 동일 출력(LCP paint와 같은 프레임). */}
      {hasMultipleSlides && (
        <div className="absolute bottom-12 md:bottom-16 left-0 right-0 z-20 flex justify-center gap-2 pointer-events-none">
          <div className="flex gap-2 pointer-events-auto">
            {slides.map((_, idx) => (
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
      {hasMultipleSlides && (
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
      {/* 풀폭 작품 비주얼. priority=true(첫 슬라이드)인 경우 fetchPriority="high"
          명시 — next/image priority가 자동으로 박지만 PSI 진단에서 누락 신호가
          잡혀 명시적으로 박아 LCP 리소스 로드 지연을 줄임.
          quality=60 — 다크 오버레이(bg-gradient-to-t from-charcoal-deep)가
          이미지 위에 깔리고 텍스트 가독성을 위해 어둡게 깔리므로 압축에 가장
          둔감한 위치. 화질 차이 시각적으로 식별 거의 불가능. PSI "이미지 압축률"
          22 KiB 절감 (LCP 이미지 + 후속 슬라이드 이미지). */}
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
