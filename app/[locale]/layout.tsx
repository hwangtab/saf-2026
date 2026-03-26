import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PageTransition from '@/components/common/PageTransition';
import ToastProvider from '@/components/providers/ToastProvider';

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
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
          <PageTransition>
            <Suspense fallback={null}>{children}</Suspense>
          </PageTransition>
        </main>
        <Suspense>
          <Footer />
        </Suspense>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
