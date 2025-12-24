'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

// 히어로 배경용 고해상도 이미지 (public/images/hero/)
const HERO_IMAGES = [
  '/images/hero/1.jpg',
  '/images/hero/2.jpg',
  '/images/hero/3.jpg',
  '/images/hero/4.jpg',
  '/images/hero/5.jpg',
  '/images/hero/6.jpg',
  '/images/hero/7.jpg',
];

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHero({
  title,
  description,
  children,
}: PageHeroProps) {
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // 클라이언트에서 랜덤 이미지 선택
    const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setBgImage(randomImage);
  }, []);

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center py-12 md:py-20 overflow-hidden">
      {/* Background Image */}
      {bgImage && (
        <Image
          src={bgImage}
          alt=""
          fill
          className="object-cover"
          priority
        />
      )}
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60" />

      {/* Content */}
      <div className="relative z-10 container-max text-center">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg">
          {title}
        </h1>
        {description && (
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance">
            {description}
          </p>
        )}
        {children && (
          <div className="mt-8 flex justify-center">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
