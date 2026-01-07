'use client';

import { useState, useEffect, useRef } from 'react';
import ExportedImage from 'next-image-export-optimizer';
import { m, AnimatePresence } from 'framer-motion';

const HERO_IMAGES = [
  { id: '11', filename: '11.jpg', alt: '2026 씨앗페 출품작' },
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
];

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isFirstRenderRef = useRef(true);

  const nextIndex = (currentIndex + 1) % HERO_IMAGES.length;
  const nextPhoto = HERO_IMAGES[nextIndex];

  useEffect(() => {
    // 첫 렌더링 후 플래그 해제
    const timer = requestAnimationFrame(() => {
      isFirstRenderRef.current = false;
    });

    const interval = setInterval(() => {
      // Only transition if the tab is focused to save resources and keep sync
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      }
    }, 5000);

    return () => {
      cancelAnimationFrame(timer);
      clearInterval(interval);
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
                scale: 1.05,
                zIndex: 1,
              }),
              animate: {
                opacity: 1,
                scale: 1.0,
                zIndex: 1,
                transition: {
                  opacity: { duration: 3, ease: 'easeInOut' },
                  scale: { duration: 6, ease: 'linear' },
                },
              },
              exit: {
                opacity: 0,
                zIndex: 0,
                transition: {
                  opacity: { duration: 0, delay: 3 }, // Wait 3s then vanish instantly
                  zIndex: { delay: 3 }, // Keep z-index until vanish
                },
              },
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            style={{ willChange: 'opacity, transform', transform: 'translateZ(0)' }}
            className="absolute inset-0"
          >
            <ExportedImage
              src={`/images/hero/${currentPhoto.filename}`}
              alt={currentPhoto.alt}
              fill
              className="object-cover"
              priority
            />
          </m.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    </>
  );
}
