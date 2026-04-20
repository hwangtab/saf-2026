'use client';

import SafeImage from '@/components/common/SafeImage';
import { HERO_IMAGES } from '@/lib/constants';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';

interface PageHeroBackgroundProps {
  customImage?: string;
  seed?: string;
}

function getDeterministicHeroIndex(seed: string): number {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return hash % HERO_IMAGES.length;
}

export default function PageHeroBackground({
  customImage,
  seed = 'default',
}: PageHeroBackgroundProps) {
  const imageIndex = getDeterministicHeroIndex(seed);

  // 원격 작품 이미지(Supabase)일 때만 picture+media query로 모바일 저해상도 분기.
  // 모바일 LCP 7~8초 문제 해결 — slider(400w) 프리셋이 약 20KB로 즉시 로드.
  // 데스크톱은 hero(1920w) 프리셋 그대로 유지.
  const isRemoteCustom = customImage?.startsWith('http');

  if (isRemoteCustom && customImage) {
    const desktopUrl = resolveArtworkImageUrlForPreset(customImage, 'hero');
    const mobileUrl = resolveArtworkImageUrlForPreset(customImage, 'slider');

    return (
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 animate-hero-breathing motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none"
          style={{ opacity: 1 }}
        >
          <picture>
            <source media="(min-width: 768px)" srcSet={desktopUrl} />
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

  // 로컬 hero 이미지 — next-image-export-optimizer가 sizes 기반 자동 분기
  const bgImage = customImage
    ? resolveArtworkImageUrlForPreset(customImage, 'hero')
    : `/images/hero/${HERO_IMAGES[imageIndex].filename}`;

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 animate-hero-breathing motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none"
        style={{ opacity: 1 }}
      >
        <SafeImage
          src={bgImage}
          alt=""
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
      </div>
    </div>
  );
}
