import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import GlobalAnalyticsGate from '@/components/common/GlobalAnalyticsGate';
import { OG_IMAGE, SITE_URL } from '@/lib/constants';
import { ARTWORK_COUNT } from '@/lib/site-stats';
import { BRAND_COLORS } from '@/lib/colors';
import '@/styles/globals.css';

// next/font/google: 빌드 타임에 Google Fonts에서 폰트 다운로드 → 자체 도메인으로 self-host 변환.
// unicode-range chunk 자동 분할로 한글 글리프가 사용 시점에 lazy fetch됨.
//
// 단일 패밀리 (Noto Sans KR) — 본문/섹션/Hero 전부. weight로 위계 표현.
// Google Fonts Noto Sans KR 정적 weight: 100/300/400/500/700/900. 600은 파일 없음 →
// font-semibold(600) 사용처는 브라우저가 가장 가까운 weight(500 또는 700)로 자동 매핑.
// 400 본문 / 500 medium·semibold / 700 bold·section·card / 900 Hero·display
//
// display: 'optional' — 첫 방문자가 100ms 안에 폰트가 로드되지 않으면 시스템 한글
// fallback(Apple SD Gothic Neo / Noto Sans CJK KR / Malgun Gothic)으로 그대로 표시,
// swap 없이 페이지가 흘러감. 결과: ① CLS 0 (폰트 swap으로 인한 레이아웃 변경 제거)
// ② LCP 측정에서 폰트 대기 시간 1초+ 절감 ③ 재방문자는 캐시된 Noto Sans KR을 즉시 사용.
// 한글 fallback이 Noto Sans KR과 시각적으로 매우 가까워 첫 방문자 디자인 차이 미세.
const notoSansKR = Noto_Sans_KR({
  weight: ['400', '500', '700', '900'],
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'optional',
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // iOS Safari auto-zoom 차단 — input focus 시 font-size<16px일 때 viewport가 줌되는
  // 이슈. 자체 modal 입력은 text-base(16px) 이상으로 처리하지만 Daum Postcode iframe
  // 같은 외부 컨텐츠는 통제 못 하므로 viewport에서 한 번 더 차단. iOS 10+는
  // maximumScale=1이어도 사용자 pinch-zoom은 허용 → a11y 영향 없음.
  maximumScale: 1,
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
  // description/keywords/authors는 [locale]/layout.tsx에서 locale별로 명시 설정.
  // 여기서 KO 기본값을 두면 /en 페이지에 한국어 leak이 발생해 SEO·일관성 회귀.
  // /ko 페이지는 [locale]/layout.tsx generateMetadata가 빈 객체 반환해 root metadata 그대로 사용 →
  // /ko 전용 description/keywords는 페이지별 generateMetadata 또는 home.metaDescription 등에서 처리.
  icons: {
    icon: '/favicon.ico',
    apple: '/images/icons/icon-192.png',
  },
  // openGraph/twitter도 [locale]/layout.tsx에서 locale별 명시 설정 — /en 페이지에서
  // KO og:title·og:description leak 방지. (auth)·(portal) 라우트는 noindex라 OG 무관.
  // Twitter site handle은 (locale-agnostic이라) 여기 유지 — locale-specific override 시
  // [locale]/layout.tsx에서 자동 머지.
  twitter: {
    site: '@saf2026',
    images: [{ url: OG_IMAGE.url }],
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

// 루트 layout은 모든 라우트(공개·포털·인증)가 공유하므로 dynamic API(getLocale 등)를 호출하면
// 전체 라우트가 dynamic(ƒ)으로 강제됨. 정적 렌더링 활성화를 위해 locale-aware 처리는 [locale]
// 하위 layout으로 위임:
// - description/keywords/authors/openGraph/twitter → [locale]/layout.tsx generateMetadata
// - Organization/WebSite/LocalBusiness JSON-LD → [locale]/layout.tsx body 렌더
//
// <html lang>은 정적 prerender 호환 위해 'ko' 고정 — metadata.alternates의 hreflang으로
// Google이 페이지 언어를 인식하고, <html lang>은 보조 신호.
const ROOT_LOCALE = 'ko' as const;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang={ROOT_LOCALE} className={notoSansKR.variable} suppressHydrationWarning>
      <head>
        {/* LCP 이미지가 next/image(/_next/image) 경유로 같은 origin에서 서빙되므로
            Supabase preconnect는 LCP 경로에 들어오지 않음 — PSI "미사용 preconnect" 진단으로
            확인되어 제거. 모든 외부 origin은 dns-prefetch로만 처리. */}
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        {children}

        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
