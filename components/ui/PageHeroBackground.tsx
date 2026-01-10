'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { HERO_IMAGES } from '@/lib/constants';

interface PageHeroBackgroundProps {
  /** Custom image path to use instead of random hero image */
  customImage?: string;
}

export default function PageHeroBackground({ customImage }: PageHeroBackgroundProps) {
  const [imageIndex, setImageIndex] = useState<number | null>(null);

  useEffect(() => {
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
    setImageIndex(newIndex);
  }, [customImage]);

  // Use custom image if provided, otherwise use random hero image
  let bgImage: string;
  if (customImage) {
    bgImage = customImage;
  } else {
    // Don't render any image until hydration is complete to prevent flash
    if (imageIndex === null) {
      return <div className="absolute inset-0 bg-gray-900" />;
    }
    bgImage = `/images/hero/${HERO_IMAGES[imageIndex].filename}`;
  }

  return (
    <div className="absolute inset-0">
      <m.div
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1.0 }}
        transition={{
          opacity: { duration: 1.2, ease: 'easeOut' },
          scale: {
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          },
        }}
        className="absolute inset-0"
      >
        <ExportedImage src={bgImage} alt="" fill className="object-cover" priority sizes="100vw" />
      </m.div>
    </div>
  );
}
