import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
import { getLocale } from 'next-intl/server';
import GlobalAnalyticsGate from '@/components/common/GlobalAnalyticsGate';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import { OG_IMAGE, SITE_URL, CONTACT } from '@/lib/constants';
import { ARTWORK_COUNT, ARTIST_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
} from '@/lib/seo-utils';
import { BRAND_COLORS } from '@/lib/colors';
import '@/styles/globals.css';

// LCP 최적화: Paperlogy 3 weight 총 417KB preload 제거.
// display: swap으로 system font fallback → Paperlogy 교체. 실사용자(LTE/5G)는 <500ms FOUT.
// Slow 4G Lab 시뮬레이션에서 LCP 대역폭 경쟁 회수가 더 큰 이득.
const paperlogy = localFont({
  src: [
    { path: '../public/fonts/Paperlogy-4Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/Paperlogy-5Medium.woff2', weight: '500', style: 'normal' },
    { path: '../public/fonts/Paperlogy-7Bold.woff2', weight: '700', style: 'normal' },
  ],
  variable: '--font-paperlogy',
  display: 'swap',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0100-024F, U+2000-206F, U+2190-21FF, U+2200-22FF, U+3000-303F, U+3131-318E, U+AC00-D7AF, U+F900-FAFF, U+FE10-FE1F, U+FF00-FFEF',
    },
  ],
});

// PartialSansKR은 hero title 전용 (font-display 클래스). 초기 LCP 이후 로드되어도
// UX 영향 미미 — display: swap으로 Paperlogy fallback 표시 후 교체. 303KB 대역폭 회수.
const partialSans = localFont({
  src: '../public/fonts/PartialSansKR-Regular.woff2',
  variable: '--font-partial-sans',
  display: 'swap',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0100-024F, U+2000-206F, U+2190-21FF, U+2200-22FF, U+3000-303F, U+3131-318E, U+AC00-D7AF, U+F900-FAFF, U+FE10-FE1F, U+FF00-FFEF',
    },
  ],
});

const schoolSafetyPoster = localFont({
  src: '../public/fonts/HakgyoansimPosterB.woff2',
  variable: '--font-section',
  display: 'swap',
  preload: false,
  declarations: [
    {
      prop: 'unicode-range',
      value:
        'U+0000-00FF, U+0100-024F, U+2000-206F, U+2190-21FF, U+2200-22FF, U+3000-303F, U+3131-318E, U+AC00-D7AF, U+F900-FAFF, U+FE10-FE1F, U+FF00-FFEF',
    },
  ],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: BRAND_COLORS.primary.DEFAULT,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  generator: undefined,
  manifest: '/manifest.webmanifest',
  metadataBase: new URL(SITE_URL),
  title: {
    default: `한국 현대미술 작품 ${ARTWORK_COUNT}점 · 회화 판화 사진 조각 원본 구매 | 씨앗페`,
    // 브랜드 suffix 제거 — Google SERP의 sitename 기능이 도메인 기반으로 브랜드를 자동 표시
    // (반복되는 "| 씨앗페 온라인 갤러리" 픽셀 낭비 방지). 페이지 단위로 브랜드 노출이 필요하면
    // generateMetadata에서 absolute title로 명시하거나 필요한 곳만 수동으로 붙임.
    template: '%s',
  },
  description: `${ARTIST_COUNT}명 한국 작가가 동료 예술인을 돕기 위해 내놓은 회화·판화·사진·조각 원본. 작품 판매 수익은 ${LOAN_COUNT}건의 저금리 대출로 이어진 예술인 상호부조 기금이 됩니다. 무료 배송·7일 이내 반품.`,
  keywords:
    '한국 현대미술, 미술 작품 구매, 작품 원본 구매, 회화 원본, 판화 원본, 사진 작품, 조각 작품, 서울 전시회, 현대미술 전시회, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 예술인 금융 차별, 예술인 대출',
  authors: [{ name: CONTACT.ORGANIZATION_NAME }],
  icons: {
    icon: '/favicon.ico',
    apple: '/images/icons/icon-192.png',
  },
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    title: `씨앗페 온라인 | 한국 현대미술 원본 작품 ${ARTWORK_COUNT}점`,
    description: `${ARTIST_COUNT}명 한국 작가가 동료 예술인을 돕기 위해 내놓은 회화·판화·사진·조각 원본. 구매 수익이 ${LOAN_COUNT}건의 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`,
    siteName: '씨앗페 온라인',
    images: [
      {
        url: OG_IMAGE.url,
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@saf2026',
    title: `씨앗페 온라인 | 한국 현대미술 원본 작품 ${ARTWORK_COUNT}점`,
    description: `${ARTIST_COUNT}명 한국 작가의 회화·판화·사진·조각 원본. 구매가 ${LOAN_COUNT}건 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`,
    images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.alt }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION || undefined,
    other: process.env.NEXT_PUBLIC_NAVER_VERIFICATION
      ? { 'naver-site-verification': process.env.NEXT_PUBLIC_NAVER_VERIFICATION }
      : undefined,
  },
  other: {
    'pinterest-rich-pin': 'true',
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const resolvedLocale = locale === 'en' ? 'en' : 'ko';
  const organizationSchema = generateOrganizationSchema(resolvedLocale);
  const websiteSchema = generateWebsiteSchema(resolvedLocale);
  const localBusinessSchema = generateLocalBusinessSchema(resolvedLocale);

  return (
    <html
      lang={locale}
      className={`${paperlogy.variable} ${partialSans.variable} ${schoolSafetyPoster.variable}`}
      suppressHydrationWarning
    >
      <head>
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link rel="preconnect" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="preconnect" href="https://t1.kakaocdn.net" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        {children}

        <JsonLdScript data={organizationSchema} />
        <JsonLdScript data={websiteSchema} />
        <JsonLdScript data={localBusinessSchema} />

        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
