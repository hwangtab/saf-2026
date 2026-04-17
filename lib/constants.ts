// External Links
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.saf2026.com';
export const SITE_URL_ALIAS = 'https://saf2026.com';

export const OG_IMAGE = {
  path: '/images/og-image.png',
  url: `${SITE_URL}/images/og-image.png`,
  width: 1200,
  height: 630,
  alt: '씨앗페 온라인 캠페인 대표 이미지',
  altEn: 'SAF Online campaign representative image',
} as const;

export const EXTERNAL_LINKS = {
  JOIN_MEMBER:
    'https://forms.office.com/Pages/ResponsePage.aspx?id=9mV1Wuu2mEyE027O-cC0uR1bZ14IzxZDqGiMboW32uhUNEFPMzlQRjQxNE04RjNPNVFCSTZaMVFNTCQlQCN0PWcu',
  ONLINE_GALLERY: 'https://www.saf2026.com',
  LOAN_INFO: 'https://www.kosmart.co.kr/loan',
  KOSMART_HOME: 'https://www.kosmart.co.kr',
  KOSMERT_2023_GALLERY: 'https://www.news-art.co.kr/news/section_list_all.html?sec_no=135',
  INSA_GALLERY_KAKAO: 'https://kko.to/SGmIwAnAmT',
  AUDIO_GUY_STUDIO_KAKAO: 'https://place.map.kakao.com/27349395',
  KOSMART_OFFICE_MAP:
    'https://map.kakao.com/?q=%EC%84%9C%EC%9A%B8%ED%8A%B9%EB%B3%84%EC%8B%9C%20%EC%98%81%EB%93%B1%ED%8F%AC%EA%B5%AC%20%EC%96%91%EC%82%B0%EB%A1%9C%2096',
  ORDER_STATUS: '/orders',
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
  ORGANIZATION_NAME_EN: 'Korea Smart Cooperative',
  REPRESENTATIVE_NAME: '서인형',
  BUSINESS_REGISTRATION_NUMBER: '385-86-01622',
  MAIL_ORDER_REPORT_NUMBER: '제2021-서울은평-0715호',
  PERSON_NAME: '황경하 조직국장',
  ADDRESS: '서울특별시 은평구 통일로 68길 4, 302호 (불광동)',
  ADDRESS_EN: '302, 4, Tongil-ro 68-gil, Eunpyeong-gu, Seoul',
  POSTAL_CODE: '03358',
};

export const ARTIST_APPLICATION_TERMS_VERSION = 'artist-contract-v4-2026-03-09';
export const EXHIBITOR_APPLICATION_TERMS_VERSION = 'exhibitor-contract-v4-2026-03-09';
export const PRIVACY_POLICY_VERSION = 'privacy-v2-2026-03-05';
export const TERMS_OF_SERVICE_VERSION = 'terms-v1-2026-03-05';

// Exhibition Info
export const EXHIBITION = {
  NAME: '씨앗페(SAF) 온라인',
  DATE: '2026년 1월 14일 - 2026년 1월 26일',
  LOCATION: '인사아트센터 3층 G&J 갤러리',
  ADDRESS: '서울시 종로구 인사동길 41-1',
  POSTAL_CODE: '03145',
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

// Merchant policies for SEO schema (E-commerce)
export const MERCHANT_POLICIES = {
  RETURN: {
    applicableCountry: 'KR',
    returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow',
    merchantReturnDays: 7,
    returnMethod: 'https://schema.org/ReturnByMail',
    returnFees: 'https://schema.org/ReturnFeesCustomerResponsibility',
  },
  SHIPPING: {
    rate: 0,
    currency: 'KRW',
    country: 'KR',
    handlingDays: { min: 1, max: 3 },
    transitDays: { min: 1, max: 7 },
  },
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
  SLIDER_INTERVAL: 5000, // 5 seconds
  COUNTER_DURATION: 2000, // 2 seconds
} as const;

// Hero 경로 판정은 lib/hero-routes.ts로 이동 (타입 강제 + 단일 출처).
// 과거 HERO_PAGES 상수는 해당 파일의 HERO_EXACT / HERO_PREFIXES로 분리되어 있음.

// Z-Index layers for consistent stacking
export const Z_INDEX = {
  HEADER: 100,
  SEARCH_DIALOG: 200,
} as const;

export const HOMEPAGE_CATEGORY_GROUPS = [
  {
    key: 'painting',
    label: '회화',
    labelEn: 'Painting',
    categories: ['회화', '한국화', '드로잉'],
    theme: 'dark' as const,
    viewAllCategory: '회화',
  },
  {
    key: 'print',
    label: '판화',
    labelEn: 'Print',
    categories: ['판화', '사후판화', '아트프린트'],
    theme: 'light' as const,
    viewAllCategory: '판화',
  },
  {
    key: 'photoMedia',
    label: '사진·미디어',
    labelEn: 'Photo & Media',
    categories: ['사진', '디지털아트', '혼합매체'],
    theme: 'dark' as const,
    viewAllCategory: '사진',
  },
  {
    key: 'sculpture',
    label: '입체·공예',
    labelEn: 'Sculpture & Craft',
    categories: ['조각', '도자/공예'],
    theme: 'light' as const,
    viewAllCategory: '조각',
  },
] as const;

type HeroImage = {
  readonly id: string;
  readonly filename: string;
  readonly alt: string;
  readonly altEn: string;
};

export const HERO_IMAGES = [
  {
    id: '1',
    filename: '1.jpg',
    alt: '신예리, 취도(鷲圖) — 씨앗페 온라인 출품작',
    altEn: 'Shin Yeri, Eagle (鷲圖) — SAF Online Exhibition',
  },
  {
    id: '3',
    filename: '3.jpg',
    alt: '최윤정, pop kids #96 — 씨앗페 온라인 출품작',
    altEn: 'Choi Yoonjung, pop kids #96 — SAF Online Exhibition',
  },
  {
    id: '4',
    filename: '4.jpg',
    alt: '이수철, 포르코 당신은 어디있나요?-1 — 씨앗페 온라인 출품작',
    altEn: 'Lee Soocheol, Porco, Where Are You?-1 — SAF Online Exhibition',
  },
  {
    id: '6',
    filename: '6.jpg',
    alt: '이광수, 回2 — 씨앗페 온라인 출품작',
    altEn: 'Lee Gwangsu, Return 2 (回2) — SAF Online Exhibition',
  },
  {
    id: '7',
    filename: '7.jpg',
    alt: '안소현, 무제 — 씨앗페 온라인 출품작',
    altEn: 'Ahn Sohyun, Untitled — SAF Online Exhibition',
  },
  {
    id: '9',
    filename: '9.jpg',
    alt: '안소현, Authentic City — 씨앗페 온라인 출품작',
    altEn: 'Ahn Sohyun, Authentic City — SAF Online Exhibition',
  },
  {
    id: '10',
    filename: '10.jpg',
    alt: '신예리, 야형화접도(夜螢花蝶圖) — 씨앗페 온라인 출품작',
    altEn: 'Shin Yeri, Fireflies and Butterflies at Night (夜螢花蝶圖) — SAF Online Exhibition',
  },
  {
    id: '11',
    filename: '11.jpg',
    alt: '신예리, 책거리 — 씨앗페 온라인 출품작',
    altEn: 'Shin Yeri, Chaekgeori — SAF Online Exhibition',
  },
  {
    id: '14',
    filename: '14.jpg',
    alt: '라인석, 곡선운동의 궤적으로부터 롯데월드타워 230817 — 씨앗페 온라인 출품작',
    altEn:
      'Ra Inseok, From the Trajectory of Curvilinear Motion: Lotte World Tower 230817 — SAF Online Exhibition',
  },
  {
    id: '17',
    filename: '17.jpg',
    alt: '이호철, The Great Resurrection (위대한 부활) — 씨앗페 온라인 출품작',
    altEn: 'Lee Hochul, The Great Resurrection — SAF Online Exhibition',
  },
] as const satisfies readonly HeroImage[];
