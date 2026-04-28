import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { OG_IMAGE } from '@/lib/constants';
import { ARTIST_COUNT, LOAN_COUNT } from '@/lib/site-stats';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import ToastProvider from '@/components/providers/ToastProvider';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (locale !== 'en') return {};

  const tSeo = await getTranslations({ locale, namespace: 'seo' });

  return {
    title: {
      default: tSeo('siteTitle'),
      template: tSeo('titleTemplate'),
    },
    description: tSeo('siteDescription', { artistCount: ARTIST_COUNT, loanCount: LOAN_COUNT }),
    // 영문 사이트는 색인 제외 (자동 번역 수준이라 thin/duplicate content).
    // follow는 유지해 내부 링크 발견·평가에는 영향 없음.
    // Next.js metadata 머지 규칙상 자식이 robots를 설정하면 부모(root layout)의 robots 객체가
    // 통째로 교체됨 → root에 있던 googleBot 디렉티브(max-snippet 등)가 사라지므로 여기서 명시.
    // index:false라 max-image-preview 등은 SERP에 노출 안 되지만 일관성·디버깅 용이성 위해 유지.
    // 페이지별 generateMetadata에서 robots를 별도 지정하면 해당 값이 우선됨.
    robots: {
      index: false,
      follow: true,
      googleBot: {
        index: false,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large',
        'max-video-preview': -1,
      },
    },
    openGraph: {
      locale: 'en_US',
      siteName: 'SAF Online',
      images: [
        { url: OG_IMAGE.url, width: OG_IMAGE.width, height: OG_IMAGE.height, alt: OG_IMAGE.altEn },
      ],
    },
    twitter: {
      images: [{ url: OG_IMAGE.url, alt: OG_IMAGE.altEn }],
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
  const messages = await getMessages();
  const publicMessages = Object.fromEntries(
    Object.entries(messages).filter(([namespace]) => !EXCLUDED_PUBLIC_NAMESPACES.has(namespace))
  );

  return (
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
          <Footer />
        </Suspense>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
