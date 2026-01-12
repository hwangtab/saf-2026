'use client';

import { useState, useEffect } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { m, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ANIMATION, HERO_IMAGES } from '@/lib/constants';
import { useIsMobile } from '@/lib/hooks/useIsMobile';

export default function BackgroundSlider() {
  const prefersReducedMotion = useReducedMotion();

  // Use a state that can hold the shuffled array. Widen the type to simple object array to avoid readonly tuple issues.
  const [images, setImages] = useState<
    typeof HERO_IMAGES | { id: string; filename: string; alt: string }[]
  >(HERO_IMAGES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFirstRender, setIsFirstRender] = useState(true);

  // 현재 이미지와 다음 이미지 계산 (셔플된 배열 기준)
  const nextIndex = (currentIndex + 1) % images.length;
  const nextPhoto = images[nextIndex];
  const currentPhoto = images[currentIndex];

  const isMobile = useIsMobile();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    // 1. 이미지 순서 섞기 (랜덤) - 클라이언트에서만 실행
    const shuffled = [...HERO_IMAGES].sort(() => Math.random() - 0.5);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImages(shuffled);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
    // 첫 렌더링 후 플래그 해제
    // 첫 렌더링 후 플래그 해제
    const timer = requestAnimationFrame(() => {
      setIsFirstRender(false);
    });

    // prefers-reduced-motion 시 자동 슬라이드 비활성화
    if (prefersReducedMotion) {
      return () => {
        cancelAnimationFrame(timer);
      };
    }

    const interval = setInterval(() => {
      // Only transition if the tab is focused to save resources and keep sync
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % images.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => {
      cancelAnimationFrame(timer);
      clearInterval(interval);
    };
  }, [images.length, prefersReducedMotion]);

  if (!isMounted) return <div className="absolute inset-0 bg-gray-900 -z-10" />;

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
      {/* Preload next image using a hidden image component */}
      <div className="invisible absolute inset-0 -z-20">
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
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <AnimatePresence>
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
