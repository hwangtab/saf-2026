'use client';

import SafeImage from '@/components/common/SafeImage';
import { useEffect, useState } from 'react';
import { HERO_IMAGES } from '@/lib/constants';
import { resolveArtworkImageUrlForPreset } from '@/lib/utils';

interface PageHeroBackgroundProps {
  /** Custom image path to use instead of random hero image */
  customImage?: string;
}

export default function PageHeroBackground({ customImage }: PageHeroBackgroundProps) {
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Skip random selection if custom image is provided
    if (customImage) {
      requestAnimationFrame(() => setIsVisible(true));
      return;
    }

    let newIndex;
    const lastIndexStr = sessionStorage.getItem('saf_last_hero_index');
    const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;

    do {
      newIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    } while (newIndex === lastIndex && HERO_IMAGES.length > 1);

    sessionStorage.setItem('saf_last_hero_index', newIndex.toString());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageIndex(newIndex);

    requestAnimationFrame(() => setIsVisible(true));
  }, [customImage]);

  let bgImage: string;
  if (customImage) {
    bgImage = resolveArtworkImageUrlForPreset(customImage, 'hero');
  } else {
    if (imageIndex === null) {
      return <div className="absolute inset-0 bg-gray-900" />;
    }
    bgImage = `/images/hero/${HERO_IMAGES[imageIndex].filename}`;
  }

  return (
    <div className="absolute inset-0">
      <div
        className="absolute inset-0 animate-hero-breathing motion-reduce:!animate-none motion-reduce:!scale-100 motion-reduce:!transition-none"
        style={{
          opacity: isVisible ? 1 : 0,
          transition: 'opacity 1200ms ease-out',
        }}
      >
        <SafeImage src={bgImage} alt="" fill className="object-cover" priority sizes="100vw" />
      </div>
    </div>
  );
}
