import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { Noto_Sans_KR } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { ARTIST_COUNT, ARTWORK_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import { BRAND_COLORS } from '@/lib/colors';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ToastProvider from '@/components/providers/ToastProvider';
import { JsonLdScript } from '@/components/common/JsonLdScript';
import GlobalAnalyticsGate from '@/components/common/GlobalAnalyticsGate';
import {
  generateOrganizationSchema,
  generateWebsiteSchema,
  generateLocalBusinessSchema,
} from '@/lib/seo-utils';
import '@/styles/globals.css';

/**
 * Multi-root layout 패턴 — 2026-05-11 fdf91485 영문 색인 정책 전환 + Agent 자문 결과
 * 옵션 3 채택. app/layout.tsx 제거하고 [locale]·(auth)·(portal) 각각이 root layout이 되어
 * <html lang>을 각 segment에서 정확히 발행.
 *
 * 이전: app/layout.tsx가 <html lang="ko"> 하드코딩 → /en에서도 ko 노출 (SEO/a11y 회귀)
 * 현재: [locale]/layout.tsx가 root로 승격, <html lang={locale}>로 정적 prerender 호환 + 정확.
 */

/**
 * Pretendard Variable이 globals.css에 import되어 한글·라틴 본문을 담당.
 * Noto Sans KR은 한자(U+3400+ CJK Unified Ideographs) fallback 전용으로 weight 400만 로드.
 * - preload: false — 한자가 없는 페이지에서 강제 preload 회피 (한자 페이지에서만 lazy 다운로드)
 * - subsets: ['latin'] — Next.js는 subsets와 무관하게 폰트가 가진 unicode-range를 모두 발행하므로
 *   ['latin']을 지정해도 결과 CSS에는 한자 unicode-range가 포함됨
 * - variable: '--font-han' — Tailwind fontFamily chain의 두 번째 family로 사용
 */
const hanjaFallback = Noto_Sans_KR({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-han',
  display: 'optional',
  preload: false,
  adjustFontFallback: true,
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: BRAND_COLORS.primary.DEFAULT,
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  const tSeo = await getTranslations({ locale, namespace: 'seo' });

  const isEn = locale === 'en';

  const ogTitle = isEn
    ? `SAF Online | ${ARTWORK_COUNT} original Korean contemporary artworks`
    : `씨앗페 온라인 | 한국 현대미술 원본 작품 ${ARTWORK_COUNT}점`;
  const ogDescription = isEn
    ? `${ARTIST_COUNT} Korean artists offer paintings, prints, photography, and sculpture to support fellow artists. Sale proceeds fund ${LOAN_COUNT} low-rate mutual-aid loans. Free shipping, 7-day returns.`
    : `${ARTIST_COUNT}명 한국 작가가 동료 예술인을 돕기 위해 내놓은 회화·판화·사진·조각 원본. 구매 수익이 ${LOAN_COUNT}건의 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;
  const twitterDescription = isEn
    ? `${ARTIST_COUNT} Korean artists' paintings, prints, photography, and sculpture — purchases fund ${LOAN_COUNT} mutual-aid loans for fellow artists. Free shipping, 7-day returns.`
    : `${ARTIST_COUNT}명 한국 작가의 회화·판화·사진·조각 원본. 구매가 ${LOAN_COUNT}건 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;

  return {
    generator: undefined,
    manifest: '/manifest.webmanifest',
    metadataBase: new URL(SITE_URL),
    title: {
      default: tSeo('siteTitle'),
      template: tSeo('titleTemplate'),
    },
    description: tSeo('siteDescription', { artistCount: ARTIST_COUNT, loanCount: LOAN_COUNT }),
    keywords: isEn
      ? 'Korean contemporary art, original artworks for sale, art gallery, artist mutual aid, SAF Online, Seed Art Festival, paintings, prints, sculpture, photography, Seoul art exhibition'
      : '한국 현대미술, 미술 작품 구매, 작품 원본 구매, 회화 원본, 판화 원본, 사진 작품, 조각 작품, 서울 전시회, 현대미술 전시회, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 예술인 금융 차별, 예술인 대출',
    authors: [{ name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME }],
    icons: {
      icon: '/favicon.ico',
      apple: '/images/icons/icon-192.png',
    },
    alternates: {
      types: {
        'application/rss+xml': '/feed.xml',
      },
    },
    openGraph: {
      type: 'website',
      locale: isEn ? 'en_US' : 'ko_KR',
      siteName: isEn ? 'SAF Online' : '씨앗페 온라인',
      title: ogTitle,
      description: ogDescription,
      images: [
        {
          url: OG_IMAGE.url,
          width: OG_IMAGE.width,
          height: OG_IMAGE.height,
          alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: '@saf2026',
      title: ogTitle,
      description: twitterDescription,
      images: [{ url: OG_IMAGE.url, alt: isEn ? OG_IMAGE.altEn : OG_IMAGE.alt }],
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
}

const EXCLUDED_PUBLIC_NAMESPACES = new Set([
  'admin',
  'dashboard',
  'exhibitor',
  'onboarding',
  'onboardingForm',
]);

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }
  setRequestLocale(locale);

  const messages = await getMessages({ locale });
  const publicMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => !EXCLUDED_PUBLIC_NAMESPACES.has(namespace))
  );

  const localeForSchema = locale === 'en' ? 'en' : 'ko';
  const organizationSchema = generateOrganizationSchema(localeForSchema);
  const websiteSchema = generateWebsiteSchema(localeForSchema);
  const localBusinessSchema = generateLocalBusinessSchema(localeForSchema);

  return (
    <html lang={locale} className={hanjaFallback.variable} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={publicMessages}>
          <ToastProvider>
            <a href="#main-content" className="skip-to-main">
              {locale === 'en' ? 'Skip to main content' : '메인 콘텐츠로 이동'}
            </a>
            <Header />
            <main id="main-content" className="flex-1 min-h-[100svh]">
              <Suspense fallback={<div className="min-h-[100svh]" aria-hidden="true" />}>
                {children}
              </Suspense>
            </main>
            <Suspense>
              <Footer locale={locale} />
            </Suspense>
            <JsonLdScript data={organizationSchema} />
            <JsonLdScript data={websiteSchema} />
            <JsonLdScript data={localBusinessSchema} />
          </ToastProvider>
        </NextIntlClientProvider>
        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
