import { Suspense } from 'react';
import type { Metadata, Viewport } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { CONTACT, OG_IMAGE, SITE_URL } from '@/lib/constants';
import { LOAN_COUNT } from '@/lib/site-stats';
import { getLiveStats } from '@/lib/live-stats';
import { BRAND_COLORS } from '@/lib/colors';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ToastProvider from '@/components/providers/ToastProvider';
import WishlistProvider from '@/components/providers/WishlistProvider';
import CartProvider from '@/components/providers/CartProvider';
import CartDrawer from '@/components/features/CartDrawer';
import ReturningVisitorGreeting from '@/components/features/ReturningVisitorGreeting';
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
 * Pretendard Variable (v1.3.9) — 92개 dynamic-subset 청크로 분할 self-host.
 * @font-face / unicode-range는 `styles/pretendard-subset.css`에 선언, globals.css 경유로 적용.
 *
 * preload: CSS @font-face로는 `<link rel=preload>`를 만들 수 없어(브라우저는 글리프가 실제
 * 필요해질 때까지 fetch를 미룸 → hero h1이 FOUT 후 swap), 최빈출 청크만 아래 <head>에서
 * 직접 preload한다. 청크는 희귀→빈출 순서라 마지막 [91](기본 라틴+최빈출 한글 ~30자),
 * [90](다음 빈출 한글 ~96자)이 거의 모든 UI/hero 텍스트를 커버하는 critical chunk다.
 * 나머지 90개는 종전대로 lazy fetch.
 *
 * 회귀 이력:
 *  - 단일 PretendardStdVariable.woff2(291KB): "Std"는 Adobe 명명체계이지 한글 subset이
 *    아니라서 한글이 fallback(Apple SD Gothic Neo)으로 떨어졌고, fallback의 최대 weight
 *    Bold 700이 적용되어 `font-black`(900)이 hero 텍스트에서 얇게 렌더됨.
 *  - 단일 PretendardVariable.woff2(2.0MB): 한글 11,172자 포함 정상 동작하지만 LCP 부담.
 *  - 현재 dynamic-subset(92청크 총 2.88MB): 페이지당 실제 사용 글리프만 lazy fetch.
 *
 * 한자 영역(U+4E00-9FFF 등)은 Pretendard 미지원 → 시스템 sans fallback chain으로 떨어짐.
 */

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // 라이트/다크 모드별 theme-color — 모바일 브라우저 UI chrome 자동 매칭.
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: BRAND_COLORS.primary.DEFAULT },
    { media: '(prefers-color-scheme: dark)', color: BRAND_COLORS.charcoal.deep },
  ],
  // 사이트는 light 모드 기준 디자인 — UA에 명시해 다크 모드 브라우저 자동 변환 비활성.
  colorScheme: 'light',
  viewportFit: 'cover',
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

// generateMetadata가 Supabase fetch(getLiveStats)를 포함하므로 Next.js 16의 conservative
// inference가 layout 전체를 dynamic으로 추정할 수 있다. force-static + 페이지별 revalidate에
// 의존하도록 의도를 명시.
export const dynamic = 'force-static';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'en' ? 'en' : 'ko';
  const tSeo = await getTranslations({ locale, namespace: 'seo' });

  const isEn = locale === 'en';
  const { artistCount, artworkCount } = await getLiveStats();

  const ogTitle = isEn
    ? `SAF Online | ${artworkCount} original Korean contemporary artworks`
    : `씨앗페 온라인 | 한국 현대미술 원본 작품 ${artworkCount}점`;
  const ogDescription = isEn
    ? `${artistCount} Korean artists offer paintings, prints, photography, and sculpture to support fellow artists. Sale proceeds fund ${LOAN_COUNT} low-rate mutual-aid loans. Free shipping, 7-day returns.`
    : `${artistCount}명 한국 작가가 동료 예술인을 돕기 위해 내놓은 회화·판화·사진·조각 원본. 구매 수익이 ${LOAN_COUNT}건의 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;
  const twitterDescription = isEn
    ? `${artistCount} Korean artists' paintings, prints, photography, and sculpture — purchases fund ${LOAN_COUNT} mutual-aid loans for fellow artists. Free shipping, 7-day returns.`
    : `${artistCount}명 한국 작가의 회화·판화·사진·조각 원본. 구매가 ${LOAN_COUNT}건 저금리 대출이 된 예술인 상호부조 기금. 무료 배송·7일 반품.`;

  return {
    generator: undefined,
    manifest: '/manifest.webmanifest',
    metadataBase: new URL(SITE_URL),
    title: {
      default: tSeo('siteTitle'),
      template: tSeo('titleTemplate'),
    },
    description: tSeo('siteDescription', { artistCount, loanCount: LOAN_COUNT }),
    keywords: isEn
      ? 'Korean contemporary art, original artworks for sale, art gallery, artist mutual aid, SAF Online, Seed Art Festival, paintings, prints, sculpture, photography, Seoul art exhibition'
      : '한국 현대미술, 미술 작품 구매, 작품 원본 구매, 회화 원본, 판화 원본, 사진 작품, 조각 작품, 서울 전시회, 현대미술 전시회, 씨앗페, 씨앗페 온라인, 예술인 상호부조, 예술인 금융 차별, 예술인 대출',
    authors: [{ name: isEn ? CONTACT.ORGANIZATION_NAME_EN : CONTACT.ORGANIZATION_NAME }],
    // iOS Safari 자동 phone-link/email-link 변환 비활성화.
    // ₩2,400,000 가격이 phone number로 잘못 link되거나 author 이메일이 mailto: 자동 전환되는 회귀 차단.
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
    // referrer 정책 — 외부 link click 시 origin 노출 최소화 + Vercel Analytics referrer 정확성 보존.
    referrer: 'strict-origin-when-cross-origin',
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
      siteName: isEn ? 'SAF Online' : '씨앗페',
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
      // Apple PWA — 홈 화면 추가 시 상태바 색상 (theme-color 보완)
      'apple-mobile-web-app-capable': 'yes',
      'apple-mobile-web-app-status-bar-style': 'default',
      'apple-mobile-web-app-title': '씨앗페',
      // Windows tile color (시작 화면 widget)
      'msapplication-TileColor': BRAND_COLORS.primary.DEFAULT,
      // mobile-web-app-capable — 표준 PWA install prompt 호환
      'mobile-web-app-capable': 'yes',
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
  const tA11y = await getTranslations({ locale, namespace: 'a11y' });

  const localeForSchema = locale === 'en' ? 'en' : 'ko';
  const { artistCount, artworkCount } = await getLiveStats();
  const schemaCounts = { artistCount, artworkCount };
  const organizationSchema = generateOrganizationSchema(localeForSchema);
  const websiteSchema = generateWebsiteSchema(localeForSchema, schemaCounts);
  const localBusinessSchema = generateLocalBusinessSchema(localeForSchema, schemaCounts);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Pretendard 최빈출 subset 청크 preload — CSS @font-face는 preload를 못 만들어
            hero h1이 swap 폰트를 lazy fetch한다. [91](라틴+최빈출 한글)·[90](다음 빈출 한글)이
            거의 모든 본문/hero 글리프를 덮는다. 상세는 파일 상단 주석 참고. */}
        <link
          rel="preload"
          href="/fonts/pretendard-subset/PretendardVariable.subset.91.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/pretendard-subset/PretendardVariable.subset.90.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        {/* LCP 이미지가 Supabase Storage origin에서 변환되므로 preconnect로 DNS+TLS 병렬화. */}
        {process.env.NEXT_PUBLIC_SUPABASE_URL && (
          <>
            <link
              rel="preconnect"
              href={process.env.NEXT_PUBLIC_SUPABASE_URL}
              crossOrigin="anonymous"
            />
            <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_SUPABASE_URL} />
          </>
        )}
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://i.ytimg.com" />
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={publicMessages}>
          <ToastProvider>
            <WishlistProvider>
              <CartProvider>
                <CartDrawer />
                <ReturningVisitorGreeting />
                <a href="#main-content" className="skip-to-main">
                  {tA11y('skipToMain')}
                </a>
                <Header />
                <main id="main-content" className="flex-1">
                  {children}
                </main>
                <Suspense fallback={null}>
                  <Footer locale={locale} />
                </Suspense>
                <JsonLdScript data={organizationSchema} />
                <JsonLdScript data={websiteSchema} />
                <JsonLdScript data={localBusinessSchema} />
              </CartProvider>
            </WishlistProvider>
          </ToastProvider>
        </NextIntlClientProvider>
        {/* RUM 측정(WebVitalsTracker)·GA·Vercel Analytics는 GlobalAnalyticsGate가 admin/dashboard/exhibitor/
            onboarding/login 제외 후 mount. 여기서 따로 mount하면 공개 페이지에서 이중 전송(dup_factor 1.5×)
            발생해 RUM 카운트·LCP 평균 모두 왜곡됨 — 과거 회귀 사례. */}
        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
