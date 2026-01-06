'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 히어로 배경용 고해상도 이미지 (public/images/hero/)
const HERO_IMAGES = [
  '/images/hero/1.jpg',
  '/images/hero/2.jpg',
  '/images/hero/3.jpg',
  '/images/hero/4.jpg',
  '/images/hero/5.jpg',
  '/images/hero/6.jpg',
  '/images/hero/7.jpg',
  '/images/hero/8.jpg',
  '/images/hero/9.jpg',
  '/images/hero/10.jpg',
  // 11.jpg는 메인 페이지 전용으로 제외
];

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHero({ title, description, children }: PageHeroProps) {
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // 클라이언트에서 랜덤 이미지 선택
    const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setBgImage(randomImage);
  }, []);

  return (
    <section className="relative min-h-[60vh] flex items-center justify-center py-12 md:py-20 overflow-hidden bg-charcoal">
      {/* Background Image */}
      <AnimatePresence>
        {bgImage && (
          <motion.div
            key={bgImage}
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1.0 }}
            transition={{
              opacity: { duration: 1.2 },
              scale: {
                duration: 20,
                ease: 'easeInOut',
                repeat: Infinity,
                repeatType: 'reverse',
              },
            }}
            className="absolute inset-0"
          >
            <Image src={bgImage} alt="" fill className="object-cover" priority />
          </motion.div>
        )}
      </AnimatePresence>
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Content */}
      <div className="relative z-10 container-max text-center w-full">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg break-keep text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance">
            {description}
          </p>
        )}
        {children && <div className="mt-8 flex justify-center">{children}</div>}
      </div>
    </section>
  );
}
