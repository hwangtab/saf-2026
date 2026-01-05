'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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
      if (document.hidden) return;
      setCurrentIndex((prev) => (prev + 1) % HERO_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const currentPhoto = HERO_IMAGES[currentIndex];

  return (
    <>
      {/* Preload next image */}
      <Link rel="preload" as="image" href={`/images/hero/${nextPhoto.filename}`} />
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <Image
          src={`/images/hero/${currentPhoto.filename}`}
          alt={currentPhoto.alt}
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/60" />
      </div>
    </>
  );
}
