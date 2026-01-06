'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

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

  const nextIndex = (currentIndex + 1) % HERO_IMAGES.length;
  const nextPhoto = HERO_IMAGES[nextIndex];

  useEffect(() => {
    const interval = setInterval(() => {
      // Only transition if the tab is focused to save resources and keep sync
      if (!document.hidden) {
        setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentPhoto = HERO_IMAGES[currentIndex];

  return (
    <>
      {/* Preload next image */}
      <Link rel="preload" as="image" href={`/images/hero/${nextPhoto.filename}`} />
      <div className="absolute inset-0 -z-10 overflow-hidden bg-gray-900">
        <AnimatePresence>
          <motion.div
            key={currentPhoto.id}
            variants={{
              initial: { opacity: 0, scale: 1.05, zIndex: 1 },
              animate: { opacity: 1, scale: 1.0, zIndex: 1 },
              exit: { opacity: 0, zIndex: 0 },
            }}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{
              opacity: { duration: 2.5, ease: 'easeInOut' },
              scale: { duration: 6, ease: 'linear' },
              // IMPORTANT: The exit delay must match the enter duration (2.5s)
              // to ensure the old image stays visible underneath while the new one fades in.
              delay: 2.5,
            }}
            className="absolute inset-0"
          >
            <Image
              src={`/images/hero/${currentPhoto.filename}`}
              alt={currentPhoto.alt}
              fill
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>
        <div className="absolute inset-0 bg-black/60 z-10" />
      </div>
    </>
  );
}
