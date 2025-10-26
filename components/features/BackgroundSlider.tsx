'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { saf2023Photos } from '@/content/saf2023-photos';

export default function BackgroundSlider() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % saf2023Photos.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {saf2023Photos.map((photo, idx) => (
        <Image
          key={photo.id}
          src={`/images/saf2023/${photo.filename}`}
          alt={photo.alt}
          fill
          className={`object-cover transition-opacity duration-1000 ${
            idx === currentIndex ? 'opacity-100' : 'opacity-0'
          }`}
          priority={idx === 0}
        />
      ))}
      <div className="absolute inset-0 bg-black/60" />
    </div>
  );
}
