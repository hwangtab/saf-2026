'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { saf2023Photos } from '@/content/saf2023-photos';

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [nextIndex, setNextIndex] = useState(1);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % saf2023Photos.length);
      setNextIndex((prev) => (prev + 1) % saf2023Photos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentPhoto = saf2023Photos[currentIndex];
  const nextPhoto = saf2023Photos[nextIndex];

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      <AnimatePresence mode="wait">
        <motion.div
          key={currentPhoto.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1 }}
          className="absolute inset-0"
        >
          <Image
            src={`/images/saf2023/${currentPhoto.filename}`}
            alt={currentPhoto.alt}
            fill
            className="object-cover"
            priority
          />
        </motion.div>
      </AnimatePresence>

      {/* Preload next image */}
      <div className="hidden">
        <Image
          src={`/images/saf2023/${nextPhoto.filename}`}
          alt={nextPhoto.alt}
          width={1}
          height={1}
        />
      </div>

      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
