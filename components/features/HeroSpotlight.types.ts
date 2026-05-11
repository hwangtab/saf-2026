/**
 * HeroSpotlight 공유 타입.
 *
 * HeroSpotlight(server orchestrator) / HeroSpotlightStatic(server LCP island) /
 * HeroSpotlightCarousel(client island) 세 컴포넌트가 동일 슬라이드 형태를 공유.
 * 'use client' 경계를 깨끗하게 유지하기 위해 타입만 모은 별도 모듈.
 */
export interface SpotlightSlide {
  slug: string;
  href: string | null;
  imageUrl: string;
  status: string;
  title: string;
  desc: string;
  cta: string;
  /** 'on' | 'coming-soon' — 배지 색상 분기 */
  state: 'on' | 'coming-soon';
}
