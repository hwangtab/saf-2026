'use client';

import ExportedImage from 'next-image-export-optimizer';
import { useEffect, useState } from 'react';
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

export default function PageHeroBackground() {
  const [bgImage, setBgImage] = useState('');

  useEffect(() => {
    // 클라이언트에서 랜덤 이미지 선택
    const randomImage = HERO_IMAGES[Math.floor(Math.random() * HERO_IMAGES.length)];
    setBgImage(randomImage);
  }, []);

  return (
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
          <ExportedImage src={bgImage} alt="" fill className="object-cover" priority />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
