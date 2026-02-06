'use client';

import { useState, useEffect, useMemo } from 'react';
import SafeImage from '@/components/common/SafeImage';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ANIMATION, HERO_IMAGES } from '@/lib/constants';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

// SSR-safe: The first image is always fixed to ensure consistency between server and client
const FIRST_IMAGE = HERO_IMAGES[0];

export default function BackgroundSlider() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();

  // State to hold the shuffled rest of the images
  const [shuffledRest, setShuffledRest] = useState<(typeof HERO_IMAGES)[number][]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Combine fixed first image with shuffled rest
  const images = useMemo(() => {
    return [FIRST_IMAGE, ...shuffledRest];
  }, [shuffledRest]);

  const currentPhoto = images[currentIndex];
  const nextIndex = (currentIndex + 1) % images.length;
  const nextPhoto = images[nextIndex];

  // Client-side only shuffle for the rest of images
  useEffect(() => {
    const rest = HERO_IMAGES.slice(1).sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: client-side only shuffle to prevent hydration mismatch
    setShuffledRest(rest);
  }, []);

  useEffect(() => {
    // Don't start interval if reduced motion is preferred
    if (prefersReducedMotion) return;

    const interval = setInterval(() => {
      // Only transition if the tab is focused
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, prefersReducedMotion]);

  // Render static image for reduced motion
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <SafeImage
          src={`/images/hero/${currentPhoto.filename}`}
          alt={currentPhoto.alt}
          fill
          className="object-cover"
          priority
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    );
  }

  return (
    <>
      {/* Preload next image */}
      {nextPhoto && nextPhoto.id !== currentPhoto.id && (
        <div className="invisible absolute inset-0 -z-20" aria-hidden="true">
          <SafeImage
            src={`/images/hero/${nextPhoto.filename}`}
            alt=""
            fill
            priority={false}
            loading="eager"
            className="object-cover"
            sizes="100vw"
          />
        </div>
      )}

      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <AnimatePresence mode="sync" initial={false}>
          <m.div
            key={currentPhoto.id}
            initial={{ opacity: 0, scale: isMobile ? 1.0 : 1.02 }}
            animate={{
              opacity: 1,
              scale: 1.0,
              zIndex: 1,
              transition: {
                opacity: { duration: isMobile ? 1 : 1.5, ease: 'easeOut' },
                scale: { duration: isMobile ? 0 : 5, ease: 'linear' },
              },
            }}
            exit={{
              opacity: 0,
              zIndex: 0,
              transition: {
                opacity: { duration: isMobile ? 1 : 1.5, ease: 'easeIn' },
              },
            }}
            className="absolute inset-0"
          >
            <SafeImage
              src={`/images/hero/${currentPhoto.filename}`}
              alt={currentPhoto.alt}
              fill
              className="object-cover"
              priority={currentIndex === 0}
              placeholder="blur"
              sizes="100vw"
            />
          </m.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    </>
  );
}
