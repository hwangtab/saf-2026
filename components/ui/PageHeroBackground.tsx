'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useEffect, useState } from 'react';
import { m } from 'framer-motion';

const HERO_IMAGES = [
  '/images/hero/1.jpg',
  '/images/hero/2.jpg',
  '/images/hero/3.jpg',
  '/images/hero/4.jpg',
  '/images/hero/5.jpg',
  '/images/hero/6.jpg',
  '/images/hero/7.jpg',
  '/images/hero/8.jpg',
  '/images/hero/9.jpg',
  '/images/hero/10.jpg',
];

export default function PageHeroBackground() {
  const [imageIndex, setImageIndex] = useState<number | null>(null);

  useEffect(() => {
    setImageIndex(Math.floor(Math.random() * HERO_IMAGES.length));
  }, []);

  const bgImage = HERO_IMAGES[imageIndex ?? 0];
  const isHydrated = imageIndex !== null;

  return (
    <div className="absolute inset-0">
      <m.div
        key={isHydrated ? bgImage : 'initial'}
        initial={{ opacity: isHydrated ? 0 : 1, scale: 1.1 }}
        animate={{ opacity: 1, scale: 1.0 }}
        transition={{
          opacity: { duration: isHydrated ? 1.2 : 0 },
          scale: {
            duration: 20,
            ease: 'easeInOut',
            repeat: Infinity,
            repeatType: 'reverse',
          },
        }}
        className="absolute inset-0"
        style={{ willChange: 'transform', transform: 'translateZ(0)' }}
      >
        <ExportedImage src={bgImage} alt="" fill className="object-cover" priority />
      </m.div>
    </div>
  );
}
