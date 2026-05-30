import type { MetadataRoute } from 'next';
import { BRAND_COLORS } from '@/lib/colors';
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
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: BRAND_COLORS.charcoal.DEFAULT,
    theme_color: BRAND_COLORS.primary.DEFAULT,
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
    // PWA shortcuts — Android 홈 화면 long-press 시 quick action 노출.
    // 주요 entry 4개(전체 작품·매거진·캠페인 소개·운용 보고서) 빠른 진입.
    shortcuts: [
      {
        name: '전체 작품',
        short_name: '작품',
        description: `한국 작가 작품 ${ARTWORK_COUNT}점 둘러보기`,
        url: '/artworks',
        icons: [{ src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '매거진',
        short_name: '매거진',
        description: '작가 인터뷰·컬렉팅 가이드·미술 산책',
        url: '/stories',
        icons: [{ src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '씨앗페 소개',
        short_name: '소개',
        description: '예술인 상호부조 캠페인',
        url: '/about',
        icons: [{ src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
      {
        name: '운용 보고서',
        short_name: '투명성',
        description: '상호부조 대출 운영 실적',
        url: '/transparency',
        icons: [{ src: '/images/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
      },
    ],
  };
}
