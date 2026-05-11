import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import localFont from 'next/font/local';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import { BRAND_COLORS } from '@/lib/colors';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PageLoader from '@/components/common/PageLoader';
import ToastProvider from '@/components/providers/ToastProvider';
import GlobalAnalyticsGate from '@/components/common/GlobalAnalyticsGate';
import '@/styles/globals.css';

/**
 * Multi-root layout — (auth) 라우트(/login, /signup 등)의 root.
 * 인증 페이지는 noindex라 SEO 영향은 적지만, <html lang>은 사용자 locale에 맞춰 발행.
 */

// Pretendard Std Variable — [locale] layout 주석 참고. KS X 1001 한글 + Latin 단일 woff2.
const pretendard = localFont({
  src: '../../public/fonts/PretendardStdVariable.woff2',
  variable: '--font-sans',
  display: 'swap',
  weight: '45 920',
  style: 'normal',
  adjustFontFallback: 'Arial',
});

// 한자 fallback — Noto Sans KR custom subset (KS X 1001 + 코드베이스 한자). [locale] layout 주석 참고.
const notoSansKrHanja = localFont({
  src: '../../public/fonts/NotoSansKR-Hanja-subset.woff2',
  variable: '--font-han',
  display: 'swap',
  weight: '400',
  style: 'normal',
  preload: false,
  adjustFontFallback: false,
  declarations: [{ prop: 'unicode-range', value: 'U+4E00-9FFF, U+F900-FAFF' }],
});

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: BRAND_COLORS.primary.DEFAULT,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  icons: {
    icon: '/favicon.ico',
    apple: '/images/icons/icon-192.png',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const messages = await getMessages({ locale });
  const skipToMain = locale === 'en' ? 'Skip to main content' : '메인 콘텐츠로 이동';

  return (
    <html
      lang={locale}
      className={`${pretendard.variable} ${notoSansKrHanja.variable}`}
      suppressHydrationWarning
    >
      <head>
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <ToastProvider>
            <a href="#main-content" className="skip-to-main">
              {skipToMain}
            </a>
            <Header />
            <main id="main-content" className="flex-1">
              <Suspense fallback={<PageLoader />}>{children}</Suspense>
            </main>
            <Suspense>
              <Footer locale={locale} />
            </Suspense>
          </ToastProvider>
        </NextIntlClientProvider>
        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
