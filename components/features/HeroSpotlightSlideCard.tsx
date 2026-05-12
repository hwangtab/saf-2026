import { ArrowRight } from 'lucide-react';
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

interface SlideCardProps {
  slide: SpotlightSlide;
  priority: boolean;
}

/**
 * HeroSpotlight 슬라이드 카드 — Server Component.
 *
 * 정적 마크업으로 SSR. embla 클래스(`flex-[0_0_100%] min-w-0`)는 vanilla embla가
 * 마운트되지 않은 경우에도 첫 슬라이드만 viewport에 보이도록 자연스럽게 동작
 * (overflow-hidden + 첫 슬라이드 100% width). enhancer가 mount되면 embla가
 * 이 DOM 그대로 잡아 슬라이드 동작 부여 → **DOM 노드 교체 없음** (LCP 회귀 회피).
 */
export default function HeroSpotlightSlideCard({ slide, priority }: SlideCardProps) {
  const inner = (
    <div className="relative min-h-[70svh] md:min-h-[85svh] w-full overflow-hidden">
      {/* 풀폭 작품 비주얼. priority=true(첫 슬라이드)인 경우 fetchPriority="high"
          명시 — next/image priority가 자동으로 박지만 PSI 진단에서 누락 신호가
          잡혀 명시적으로 박아 LCP 리소스 로드 지연을 줄임.
          quality=60 — 다크 오버레이(bg-gradient-to-t from-charcoal-deep)가
          이미지 위에 깔리고 텍스트 가독성을 위해 어둡게 깔리므로 압축에 가장
          둔감한 위치. */}
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
        {/* 모든 슬라이드 h1 유지 — 기존 동작 보존(speakable schema가 h1 selector에
            의존. priority prop은 첫 슬라이드만 true로 들어와 LCP 우선순위 결정) */}
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
      <Link href={slide.href} className={`${slideClass} block group`} data-embla-slide>
        {inner}
      </Link>
    );
  }
  return (
    <div className={`${slideClass} cursor-not-allowed`} data-embla-slide>
      {inner}
    </div>
  );
}
