import { Suspense } from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { OG_IMAGE } from '@/lib/constants';
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
    description: tSeo('siteDescription'),
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
        <main id="main-content" className="flex-1">
          <Suspense fallback={null}>{children}</Suspense>
        </main>
        <Suspense>
          <Footer />
        </Suspense>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
