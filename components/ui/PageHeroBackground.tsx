import { getHeroImageUrls } from '@/lib/hero-image';

interface PageHeroBackgroundProps {
  customImage: string;
  seed?: string;
  /**
   * hero 배경 이미지 alt. 빈 값이면 네이버 사이트 진단이 "Alt 속성 누락"으로
   * 집계하므로(PageHero는 거의 모든 공개 페이지에 깔림) 페이지 제목을 전달받아 채운다.
   */
  alt: string;
}

/**
 * Hero 배경 이미지 picture/srcSet. lib/hero-image의 getHeroImageUrls helper와
 * 단일 출처를 공유 — PageHero의 자동 preload가 같은 URL을 가리킴.
 *
 * 분기:
 * - 모바일 (<768px): slider preset (400w / quality 75) — LCP 빠르게
 * - 데스크탑 (≥768px): 1x=1200w, 2x(Retina)=1920w (quality 80)
 *
 * 서버 컴포넌트. animate-hero-breathing은 motion-reduce에서 자동 비활성.
 */
export default function PageHeroBackground({ customImage, alt }: PageHeroBackgroundProps) {
  const urls = getHeroImageUrls(customImage);
  if (!urls) return null;

  const isLocal = !customImage.startsWith('http');

  if (isLocal) {
    // 로컬 자산(/images/...). 단일 URL을 background-image로.
    return (
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 animate-hero-breathing transform-gpu will-change-transform motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none bg-cover bg-center"
          style={{ backgroundImage: `url(${urls.mobile})` }}
        />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 animate-hero-breathing transform-gpu will-change-transform motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none">
        <picture>
          <source
            media="(min-width: 768px)"
            srcSet={`${urls.desktop1x} 1x, ${urls.desktop2x} 2x`}
          />
          {}
          <img
            src={urls.mobile}
            alt={alt}
            loading="eager"
            fetchPriority="high"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover"
          />
        </picture>
      </div>
    </div>
  );
}
