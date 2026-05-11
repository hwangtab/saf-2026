import type { Metadata, Viewport } from 'next';
import { Suspense } from 'react';
import { Noto_Sans_KR } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { BRAND_COLORS } from '@/lib/colors';
import NavigationProgress from '@/components/layout/NavigationProgress';
import ToastProvider from '@/components/providers/ToastProvider';
import GlobalAnalyticsGate from '@/components/common/GlobalAnalyticsGate';
import '@/styles/globals.css';
import '@/styles/portal.css';

/**
 * Multi-root layout — (portal) 라우트(/admin, /dashboard, /exhibitor)의 root.
 * 관리자·작가 포털은 KO 전용이라 <html lang="ko"> 고정.
 */

/**
 * Pretendard Variable이 globals.css에 import되어 한글·라틴 본문을 담당.
 * Noto Sans KR은 한자 fallback 전용으로 weight 400만, preload: false로 로드.
 * 자세한 내용은 app/[locale]/layout.tsx 주석 참조.
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

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const t = await getTranslations('a11y');

  return (
    <html lang="ko" className={hanjaFallback.variable} suppressHydrationWarning>
      <head>
        <link rel="dns-prefetch" href="https://t1.kakaocdn.net" />
        <link rel="dns-prefetch" href="https://dapi.kakao.com" />
      </head>
      <body className="bg-canvas-soft text-charcoal flex flex-col min-h-screen font-sans antialiased">
        <NextIntlClientProvider messages={messages}>
          <ToastProvider>
            <Suspense fallback={null}>
              <NavigationProgress />
            </Suspense>
            <a href="#portal-content" className="skip-to-main">
              {t('skipToMain')}
            </a>
            <div id="portal-content">{children}</div>
          </ToastProvider>
        </NextIntlClientProvider>
        <GlobalAnalyticsGate />
      </body>
    </html>
  );
}
