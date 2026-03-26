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
