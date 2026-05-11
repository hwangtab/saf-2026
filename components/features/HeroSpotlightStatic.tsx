import { ArrowRight } from 'lucide-react';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import type { SpotlightSlide } from './HeroSpotlight.types';

/**
 * HeroSpotlight 첫 슬라이드 — server-rendered LCP island.
 *
 * 분리 이유 (PSI 진단):
 * - 메인 페이지 LCP element는 hero carousel 첫 슬라이드 작품 이미지
 * - PSI 모바일 측정 결과 element render delay 907~943ms (캐시·서버와 무관, 일관됨)
 * - 원인: 기존 HeroSpotlight 전체가 'use client'. embla-carousel-react + Autoplay
 *   hydration이 main thread를 점유하면서 첫 paint를 지연시키는 강한 후보.
 * - 해결: 첫 슬라이드 정적 마크업을 server component로 분리해 hydration 전 즉시 paint.
 *   carousel JS가 client에서 mount되면 그 시점에 carousel이 위에 덮어쓰며 인터랙션 활성화.
 *
 * 마크업은 HeroSpotlight.tsx의 SlideCard와 시각적으로 동일해야 함 — carousel mount 시점에
 * 깜박임(flash) 방지. style/className 둘이 어긋나면 hydration mismatch 같은 시각 회귀 발생.
 *
 * 본 컴포넌트는 absolute 위치가 아니라 자연스러운 흐름에 배치된 후, carousel mount 시
 * 부모 컨테이너에서 carousel(absolute)이 위에 덮어쓴다. 동일 이미지·동일 텍스트이므로
 * 사용자 입장에서 시각 변화는 거의 없음.
 */
export default function HeroSpotlightStatic({ slide }: { slide: SpotlightSlide }) {
  const inner = (
    <div className="relative min-h-[70svh] md:min-h-[85svh] w-full overflow-hidden">
      <SafeImage
        src={slide.imageUrl}
        alt={slide.title}
        fill
        priority
        fetchPriority="high"
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

  if (slide.href) {
    return (
      <Link href={slide.href} className="block group">
        {inner}
      </Link>
    );
  }
  return <div className="cursor-not-allowed">{inner}</div>;
}
