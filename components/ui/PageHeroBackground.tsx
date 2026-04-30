import { resolveArtworkImageUrlForPreset, resolveOptimizedArtworkImageUrl } from '@/lib/utils';

interface PageHeroBackgroundProps {
  customImage: string;
  seed?: string;
}

/**
 * 작가/카테고리 페이지용 Hero 배경 이미지.
 * customImage(Supabase 작품 이미지)가 있을 때만 렌더됨.
 * 기본 Hero(이미지 없음)는 PageHero의 gradient로 처리.
 *
 * picture + media query로 모바일/데스크탑 분기:
 * - 모바일 (<768px): slider preset (400w) 단일 URL — LCP 빠르게
 * - 데스크탑 (≥768px): 1x/2x DPR 대응 srcSet (1200w + 1920w)
 *
 * 서버 컴포넌트로 전환 — hash 계산 단순화, hydration 부담 제거.
 */
export default function PageHeroBackground({ customImage }: PageHeroBackgroundProps) {
  const isRemote = customImage.startsWith('http');

  if (!isRemote) {
    // 로컬 이미지 (거의 사용 안 함) — 단순 렌더
    return (
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 animate-hero-breathing motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none bg-cover bg-center"
          style={{ backgroundImage: `url(${customImage})` }}
        />
      </div>
    );
  }

  // Supabase 원격 이미지 — transform URL로 다중 해상도
  const mobileUrl = resolveArtworkImageUrlForPreset(customImage, 'slider');
  const desktop1x = resolveOptimizedArtworkImageUrl(customImage, { width: 1200, quality: 80 });
  const desktop2x = resolveOptimizedArtworkImageUrl(customImage, { width: 1920, quality: 80 });

  return (
    <div className="absolute inset-0">
      <div className="absolute inset-0 animate-hero-breathing motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none">
        <picture>
          <source media="(min-width: 768px)" srcSet={`${desktop1x} 1x, ${desktop2x} 2x`} />
          {}
          <img
            src={mobileUrl}
            alt=""
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
