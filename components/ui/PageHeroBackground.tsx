'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useEffect, useState } from 'react';
import { m } from 'framer-motion';
import { HERO_IMAGES } from '@/lib/constants';

export default function PageHeroBackground() {
  const [imageIndex, setImageIndex] = useState<number | null>(null);

  useEffect(() => {
    setImageIndex(Math.floor(Math.random() * HERO_IMAGES.length));
  }, []);

  // Don't render any image until hydration is complete to prevent flash
  if (imageIndex === null) {
    return <div className="absolute inset-0 bg-gray-900" />;
  }

  const bgImage = `/images/hero/${HERO_IMAGES[imageIndex].filename}`;

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
        <ExportedImage src={bgImage} alt="" fill className="object-cover" priority />
      </m.div>
    </div>
  );
}
