'use client';

import { useState, useEffect, useRef } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { m, AnimatePresence } from 'framer-motion';
import { ANIMATION } from '@/lib/constants';

const HERO_IMAGES = [
  { id: '1', filename: '1.jpg', alt: '2026 씨앗페 출품작' },
  { id: '2', filename: '2.jpg', alt: '2026 씨앗페 출품작' },
  { id: '3', filename: '3.jpg', alt: '2026 씨앗페 출품작' },
  { id: '4', filename: '4.jpg', alt: '2026 씨앗페 출품작' },
  { id: '5', filename: '5.jpg', alt: '2026 씨앗페 출품작' },
  { id: '6', filename: '6.jpg', alt: '2026 씨앗페 출품작' },
  { id: '7', filename: '7.jpg', alt: '2026 씨앗페 출품작' },
  { id: '8', filename: '8.jpg', alt: '2026 씨앗페 출품작' },
  { id: '9', filename: '9.jpg', alt: '2026 씨앗페 출품작' },
  { id: '10', filename: '10.jpg', alt: '2026 씨앗페 출품작' },
  { id: '11', filename: '11.jpg', alt: '2026 씨앗페 출품작' },
  { id: '12', filename: '12.jpg', alt: '2026 씨앗페 출품작' },
  { id: '13', filename: '13.jpg', alt: '2026 씨앗페 출품작' },
  { id: '14', filename: '14.jpg', alt: '2026 씨앗페 출품작' },
  { id: '15', filename: '15.jpg', alt: '2026 씨앗페 출품작' },
  { id: '16', filename: '16.jpg', alt: '2026 씨앗페 출품작' },
  { id: '17', filename: '17.jpg', alt: '2026 씨앗페 출품작' },
  { id: '18', filename: '18.jpg', alt: '2026 씨앗페 출품작' },
];

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isFirstRenderRef = useRef(true);

  const nextIndex = (currentIndex + 1) % HERO_IMAGES.length;
  const nextPhoto = HERO_IMAGES[nextIndex];

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // 첫 렌더링 후 플래그 해제
    const timer = requestAnimationFrame(() => {
      isFirstRenderRef.current = false;
    });

    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkMobile();

    // Debounced resize handler could be better, but simple listener is okay for this scope
    window.addEventListener('resize', checkMobile);

    const interval = setInterval(() => {
      // Only transition if the tab is focused to save resources and keep sync
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      }
    }, ANIMATION.SLIDER_INTERVAL);

    return () => {
      cancelAnimationFrame(timer);
      clearInterval(interval);
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  const currentPhoto = HERO_IMAGES[currentIndex];

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
        />
      </div>
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <AnimatePresence>
          <m.div
            key={currentPhoto.id}
            custom={isFirstRenderRef.current}
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
              blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAMI/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDAAQREiEiMQUGE0H/xAAVAQEBAAAAAAAAAAAAAAAAAAAFBv/EABsRAAICAwEAAAAAAAAAAAAAAAECAAMEESFB/9oADAMBAAIRAxEAPwCPtXtdjcXEt3FdTR+0mNVxGxRo8DBIYEEbjGR+VN4HxvkoHYyyu627RoVDMVVgRsAN/wBpSl6GK7ZzYpkB5PZ/J//Z"
            />
          </m.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    </>
  );
}
