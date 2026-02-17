'use client';

import { useEffect, useState } from 'react';
import SafeImage from '@/components/common/SafeImage';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ANIMATION, HERO_IMAGES } from '@/lib/constants';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function BackgroundSlider() {
  const prefersReducedMotion = useReducedMotion();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const images = HERO_IMAGES;

  const currentPhoto = images[currentIndex];
  const nextIndex = (currentIndex + 1) % images.length;
  const nextPhoto = images[nextIndex];

  useEffect(() => {
    // Don't start interval if reduced motion is preferred
    if (prefersReducedMotion || isPaused) return;

    const interval = setInterval(() => {
      // Only transition if the tab is focused
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, prefersReducedMotion, isPaused]);

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
            loading="lazy"
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
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="absolute bottom-4 right-4 z-20 rounded-md bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-pressed={isPaused}
            aria-label={isPaused ? '배경 슬라이드 재생' : '배경 슬라이드 일시정지'}
          >
            {isPaused ? '재생' : '일시정지'}
          </button>
        )}
      </div>
    </>
  );
}
