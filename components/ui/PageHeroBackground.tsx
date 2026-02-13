'use client';

import SafeImage from '@/components/common/SafeImage';
import { useEffect, useState } from 'react';
import { m, useReducedMotion } from 'framer-motion';
import { HERO_IMAGES } from '@/lib/constants';
import { resolveOptimizedArtworkImageUrl } from '@/lib/utils';

interface PageHeroBackgroundProps {
  /** Custom image path to use instead of random hero image */
  customImage?: string;
}

export default function PageHeroBackground({ customImage }: PageHeroBackgroundProps) {
  const prefersReducedMotion = useReducedMotion();
  const [imageIndex, setImageIndex] = useState<number | null>(null);
  const [isFirstRender, setIsFirstRender] = useState(true);

  useEffect(() => {
    // 첫 렌더링 후 플래그 해제
    const timer = requestAnimationFrame(() => {
      setIsFirstRender(false);
    });

    // Skip random selection if custom image is provided
    if (customImage) return;

    let newIndex;
    // Get the last used index to avoid repetition
    const lastIndexStr = sessionStorage.getItem('saf_last_hero_index');
    const lastIndex = lastIndexStr ? parseInt(lastIndexStr, 10) : -1;

    // Retry randomly until we get a different index
    // This ensures we don't show the same background twice in a row on navigation
    do {
      newIndex = Math.floor(Math.random() * HERO_IMAGES.length);
    } while (newIndex === lastIndex && HERO_IMAGES.length > 1);

    // Save the new index for next time
    sessionStorage.setItem('saf_last_hero_index', newIndex.toString());
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageIndex(newIndex);

    return () => cancelAnimationFrame(timer);
  }, [customImage]);

  // Use custom image if provided, otherwise use random hero image
  let bgImage: string;
  if (customImage) {
    bgImage = resolveOptimizedArtworkImageUrl(customImage, {
      width: 1920,
      quality: 75,
      format: 'webp',
    });
  } else {
    // Don't render any image until hydration is complete to prevent flash
    if (imageIndex === null) {
      return <div className="absolute inset-0 bg-gray-900" />;
    }
    bgImage = `/images/hero/${HERO_IMAGES[imageIndex].filename}`;
  }

  // prefers-reduced-motion: 정적 이미지만 표시 (확대 애니메이션 없음)
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0">
        <SafeImage src={bgImage} alt="" fill className="object-cover" priority sizes="100vw" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0">
      <m.div
        initial={{ opacity: isFirstRender ? 1 : 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1.0 }}
        transition={{
          opacity: { duration: isFirstRender ? 0 : 1.2, ease: 'easeOut' },
          scale: {
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          },
        }}
        className="absolute inset-0"
      >
        <SafeImage src={bgImage} alt="" fill className="object-cover" priority sizes="100vw" />
      </m.div>
    </div>
  );
}
