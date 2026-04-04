'use client';

import { useEffect, useState } from 'react';
import SafeImage from '@/components/common/SafeImage';
import { useLocale, useTranslations } from 'next-intl';
import { ANIMATION, HERO_IMAGES } from '@/lib/constants';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function BackgroundSlider() {
  const t = useTranslations('backgroundSlider');
  const locale = useLocale();
  const isMobile = useIsMobile();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isMotionStarted, setIsMotionStarted] = useState(false);
  const [layers, setLayers] = useState<{ active: 'a' | 'b'; aIndex: number; bIndex: number }>({
    active: 'a',
    aIndex: 0,
    bIndex: 0,
  });
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const images = HERO_IMAGES;

  // Detect prefers-reduced-motion (replaces FM useReducedMotion)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync with OS accessibility setting
    setPrefersReducedMotion(mq.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  useEffect(() => {
    if (prefersReducedMotion) return;
    const timeoutId = setTimeout(() => {
      setIsMotionStarted(true);
    }, 1200);
    return () => clearTimeout(timeoutId);
  }, [prefersReducedMotion]);

  useEffect(() => {
    if (!isMotionStarted || isPaused) return;

    const interval = setInterval(() => {
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, isMotionStarted, isPaused]);

  // Update the inactive layer's image, then toggle active layer
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: sync layer state with currentIndex for crossfade
    setLayers((prev) => {
      if (currentIndex === 0) {
        return { active: 'a', aIndex: 0, bIndex: prev.bIndex };
      }
      if (prev.active === 'a') {
        return { ...prev, bIndex: currentIndex, active: 'b' };
      }
      return { ...prev, aIndex: currentIndex, active: 'a' };
    });
  }, [currentIndex]);

  const nextIndex = (currentIndex + 1) % images.length;
  const nextPhoto = images[nextIndex];
  const currentPhoto = images[currentIndex];

  // Static image for reduced motion or pre-animation state
  if (prefersReducedMotion || !isMotionStarted) {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <SafeImage
          src={`/images/hero/${currentPhoto.filename}`}
          alt={locale === 'en' ? currentPhoto.altEn : currentPhoto.alt}
          fill
          className="object-cover"
          priority
          sizes="(max-width: 768px) 100vw, 1200px"
        />
        <div className="absolute inset-0 bg-black/30 z-10" />
      </div>
    );
  }

  const transitionDuration = isMobile ? '1000ms' : '1500ms';
  const scaleDuration = isMobile ? '0ms' : '5000ms';

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
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>
      )}

      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        {/* Layer A */}
        <div
          className="absolute inset-0 will-change-[opacity,transform]"
          style={{
            opacity: layers.active === 'a' ? 1 : 0,
            transform: layers.active === 'a' ? 'scale(1)' : `scale(${isMobile ? 1 : 1.02})`,
            transition: `opacity ${transitionDuration} ease-out, transform ${scaleDuration} linear`,
            zIndex: layers.active === 'a' ? 1 : 0,
          }}
        >
          <SafeImage
            src={`/images/hero/${images[layers.aIndex].filename}`}
            alt={locale === 'en' ? images[layers.aIndex].altEn : images[layers.aIndex].alt}
            fill
            className="object-cover"
            priority={layers.aIndex === 0}
            placeholder="blur"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>

        {/* Layer B */}
        <div
          className="absolute inset-0 will-change-[opacity,transform]"
          style={{
            opacity: layers.active === 'b' ? 1 : 0,
            transform: layers.active === 'b' ? 'scale(1)' : `scale(${isMobile ? 1 : 1.02})`,
            transition: `opacity ${transitionDuration} ease-out, transform ${scaleDuration} linear`,
            zIndex: layers.active === 'b' ? 1 : 0,
          }}
        >
          <SafeImage
            src={`/images/hero/${images[layers.bIndex].filename}`}
            alt={locale === 'en' ? images[layers.bIndex].altEn : images[layers.bIndex].alt}
            fill
            className="object-cover"
            placeholder="blur"
            sizes="(max-width: 768px) 100vw, 1200px"
          />
        </div>

        <div className="absolute inset-0 bg-black/30 z-10" />
        {images.length > 1 && (
          <button
            type="button"
            onClick={() => setIsPaused((prev) => !prev)}
            className="absolute bottom-4 right-4 z-20 rounded-md bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm hover:bg-black/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-pressed={isPaused}
            aria-label={isPaused ? t('playAria') : t('pauseAria')}
          >
            {isPaused ? t('play') : t('pause')}
          </button>
        )}
      </div>
    </>
  );
}
