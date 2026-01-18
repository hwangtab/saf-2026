import { BreadcrumbItem } from '@/types';

// External Links
export const SITE_URL = 'https://www.saf2026.com';
export const SITE_URL_ALIAS = 'https://saf2026.com';

export const OG_IMAGE = {
  path: '/images/og-image2.png',
  url: `${SITE_URL}/images/og-image2.png`,
  width: 1200,
  height: 630,
  alt: '씨앗페 2026 캠페인 대표 이미지',
} as const;

export const EXTERNAL_LINKS = {
  DONATE: 'https://www.socialfunch.org/SAF',
  ONLINE_GALLERY: 'https://auto-graph.co.kr',
  LOAN_INFO: 'https://www.kosmart.co.kr/loan',
  KOSMART_HOME: 'https://www.kosmart.co.kr',
  KOSMERT_2023_GALLERY: 'https://www.news-art.co.kr/news/section_list_all.html?sec_no=135',
  INSA_GALLERY_KAKAO: 'https://kko.to/SGmIwAnAmT',
  AUDIO_GUY_STUDIO_KAKAO: 'https://place.map.kakao.com/27349395',
  KOSMART_OFFICE_MAP:
    'https://map.kakao.com/?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EC%98%81%EB%93%B1%ED%8F%AC%EA%B5%AC%20%EC%96%91%EC%82%B0%EB%A1%9C%2096',
};

// Social Links
export const SOCIAL_LINKS = {
  INSTAGRAM: 'https://www.instagram.com/koreasmartcoop',
  FACEBOOK: 'https://www.facebook.com/koreasmartcoop',
  TWITTER: 'https://twitter.com/saf2026',
  YOUTUBE: 'https://www.youtube.com/@Social_Mutual_ART',
};

// Contact
export const CONTACT = {
  EMAIL: 'contact@kosmart.org',
  PHONE: '02-764-3114',
  ORGANIZATION_NAME: '한국스마트협동조합',
  PERSON_NAME: '황경하 조직국장',
  ADDRESS: '서울특별시 영등포구 양산로 96 A213호',
};

// Exhibition Info
export const EXHIBITION = {
  NAME: '씨앗페(SAF) 2026',
  DATE: '2026년 1월 14일 - 2026년 1월 26일',
  LOCATION: '인사아트센터 3층 G&J 갤러리',
  ADDRESS: '서울시 종로구 인사동길 41-1',
  LAT: 37.573,
  LNG: 126.986,
  ACCESS: {
    SUBWAY: [
      { line: '3호선 안국역', exit: '1번 출구', walk: '도보 5분' },
      { line: '5호선 광화문역', exit: '2번 출구', walk: '도보 10분' },
    ],
    BUS: {
      stop: '효자로 정류소',
      lines: '202, 703, 721, 910 등',
    },
    PARKING: '인사동 주변 공영주차장 이용 (카카오맵에서 확인 가능)',
  },
};

// Campaign dates for SEO schema
export const CAMPAIGN = {
  START_DATE: '2026-01-14',
  END_DATE: '2026-01-26',
} as const;

// Statistics Data
export const STATISTICS_DATA = [
  { label: '제1금융권 배제율', value: 84.9, unit: '%' },
  { label: '고리대금 노출 예술인', value: 48.6, unit: '%' },
  { label: '상호부조 대출 상환율', value: 95, unit: '%' },
  { label: '지원 예술인 수', value: 150, unit: '명' },
  { label: '조성 기금', value: 125340000, unit: '원' },
  { label: '대출 가능 금액', value: 1000000000, unit: '원' },
];

// Animation & Timing Constants
export const ANIMATION = {
  // Background slider
  SLIDER_INTERVAL: 5000, // 5 seconds
  SLIDER_FADE_DURATION: 1000, // 1 second

  // Counter animations
  COUNTER_DURATION: 2000, // 2 seconds
  COUNTER_DELAY: 100, // 100ms

  // General transitions
  FADE_DURATION: 300, // 300ms
  HOVER_DURATION: 200, // 200ms

  // Debounce timings
  SEARCH_DEBOUNCE: 300, // 300ms
} as const;

// Re-export helpers from seo-utils for backward compatibility
export { escapeJsonLdForScript, createBreadcrumbSchema } from '@/lib/seo-utils';
export type { BreadcrumbItem } from '@/types';

// Common breadcrumb items
export const BREADCRUMB_HOME: BreadcrumbItem = {
  name: '홈',
  url: SITE_URL,
};

export const BREADCRUMBS: Record<string, BreadcrumbItem> = {
  '/our-reality': { name: '우리의 현실', url: `${SITE_URL}/our-reality` },
  '/our-proof': { name: '우리의 증명', url: `${SITE_URL}/our-proof` },
  '/exhibition': { name: '전시 안내', url: `${SITE_URL}/exhibition` },
  '/artworks': { name: '출품작', url: `${SITE_URL}/artworks` },
  '/archive': { name: '아카이브', url: `${SITE_URL}/archive` },
  '/news': { name: '언론 보도', url: `${SITE_URL}/news` },
} as const;

export const HERO_PAGES = [
  '/',
  '/our-reality',
  '/our-proof',
  '/exhibition',
  '/archive',
  '/news',
  '/artworks',
] as const;

export type HeroPage = (typeof HERO_PAGES)[number];

// Z-Index layers for consistent stacking
export const Z_INDEX = {
  HEADER: 100,
  MOBILE_BACKDROP: 110,
  MOBILE_MENU: 120,
  MODAL: 130,
  TOAST: 140,
} as const;

export const HERO_IMAGES = [
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
  { id: '11', filename: '11.jpg', alt: '2026 씨앗페 출품작' },
  { id: '12', filename: '12.jpg', alt: '2026 씨앗페 출품작' },
  { id: '13', filename: '13.jpg', alt: '2026 씨앗페 출품작' },
  { id: '14', filename: '14.jpg', alt: '2026 씨앗페 출품작' },
  { id: '15', filename: '15.jpg', alt: '2026 씨앗페 출품작' },
  { id: '16', filename: '16.jpg', alt: '2026 씨앗페 출품작' },
  { id: '17', filename: '17.jpg', alt: '2026 씨앗페 출품작' },
  { id: '18', filename: '18.jpg', alt: '2026 씨앗페 출품작' },
] as const;
