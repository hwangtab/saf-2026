'use client';

import { useState, useEffect } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ANIMATION, HERO_IMAGES } from '@/lib/constants';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function BackgroundSlider() {
  const prefersReducedMotion = useReducedMotion();

  // Use a state that can hold the shuffled array.
  // Initialize with empty array to prevent hydration mismatch and ensure client-side only logic starts clean.
  const [images, setImages] = useState<
    typeof HERO_IMAGES | { id: string; filename: string; alt: string }[]
  >([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // 현재 이미지와 다음 이미지 계산 (셔플된 배열 기준)
  // images가 비어있을 때를 대비해 safe check
  const nextIndex = images.length > 0 ? (currentIndex + 1) % images.length : 0;
  const currentPhoto = images[currentIndex];
  // Next photo to preload
  const nextPhoto = images[nextIndex];

  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  // Initialization effect - runs once on mount
  // This pattern is intentional: we start with empty state on server to prevent hydration mismatch,
  // then populate with shuffled images on client. This is a valid use of setState in useEffect for initialization.
  useEffect(() => {
    const shuffled = [...HERO_IMAGES].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: client-only initialization to prevent hydration mismatch
    setImages(shuffled);
    setIsMounted(true);

    const timer = requestAnimationFrame(() => {
      setIsFirstRender(false);
    });

    return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (images.length === 0 || prefersReducedMotion) return;

    const interval = setInterval(() => {
      // Only transition if the tab is focused to save resources and keep sync
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => clearInterval(interval);
  }, [images.length, prefersReducedMotion]);

  if (!isMounted || images.length === 0)
    return <div className="absolute inset-0 bg-gray-900 -z-10" />;

  // prefers-reduced-motion: 정적 이미지만 표시
  if (prefersReducedMotion) {
    return (
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <ExportedImage
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
      {/* 
        Optimization: Only preload the NEXT image.
        We use a hidden image with loading="eager" to force the browser to download it.
        This ensures that when the slide changes, the image is ready.
        We do NOT render the entire list, preventing 18-20 images from loading at once.
      */}
      {nextPhoto && (
        <div className="invisible absolute inset-0 -z-20" aria-hidden="true">
          <ExportedImage
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
        <AnimatePresence mode="popLayout">
          <m.div
            key={currentPhoto.id}
            custom={isFirstRender}
            variants={{
              initial: (isFirst: boolean) => ({
                opacity: isFirst ? 1 : 0,
                // Mobile: reduce scale effect to save GPU memory
                scale: isMobile ? 1.0 : 1.05,
                zIndex: 1,
              }),
              animate: {
                opacity: 1,
                scale: 1.0,
                zIndex: 1,
                transition: {
                  // Faster transition on mobile for battery saving
                  opacity: { duration: isMobile ? 1.5 : 3, ease: 'easeInOut' },
                  scale: { duration: isMobile ? 0 : 6, ease: 'linear' },
                },
              },
              exit: {
                opacity: 0,
                zIndex: 0,
                transition: {
                  opacity: { duration: 0, delay: isMobile ? 1.5 : 3 }, // Wait then vanish
                  zIndex: { delay: isMobile ? 1.5 : 3 },
                },
              },
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            className="absolute inset-0"
          >
            <ExportedImage
              src={`/images/hero/${currentPhoto.filename}`}
              alt={currentPhoto.alt}
              fill
              className="object-cover"
              priority
              placeholder="blur"
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMI/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQREiEiMQUGE0H/xAAVAQEBAAAAAAAAAAAAAAAAAAAFBv/EABsRAAICAwEAAAAAAAAAAAAAAAECAAMEESFB/9oADAMBAAIRAxAPwCPtXtdjcXEt3FdTR+0mNVxGxRo8DBIYEEbjGR+VN4HxvkoHYyyu627RoVDMVVgRsAN/wBpSl6GK7ZzYpkB5PZ/J//Z"
              sizes="100vw"
            />
          </m.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    </>
  );
}
