import type { MetadataRoute } from 'next';
import { ARTWORK_COUNT } from '@/lib/site-stats';

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: '/',
    name: '씨앗페 온라인',
    short_name: '씨앗페',
    description: `한국 현대미술 작품 ${ARTWORK_COUNT}점 온라인 구매 — 회화, 판화, 사진, 조각`,
    lang: 'ko',
    dir: 'ltr',
    categories: ['shopping', 'lifestyle', 'art'],
    start_url: '/',
    display: 'standalone',
    background_color: '#31393C',
    theme_color: '#2176FF',
    icons: [
      {
        src: '/images/icons/icon-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'any',
      },
      {
        src: '/images/icons/icon-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'any',
      },
      {
        src: '/images/icons/icon-maskable-192.png',
        type: 'image/png',
        sizes: '192x192',
        purpose: 'maskable',
      },
      {
        src: '/images/icons/icon-maskable-512.png',
        type: 'image/png',
        sizes: '512x512',
        purpose: 'maskable',
      },
    ],
  };
}
