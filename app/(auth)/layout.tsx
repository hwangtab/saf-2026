import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PageLoader from '@/components/common/PageLoader';
import ToastProvider from '@/components/providers/ToastProvider';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const messages = await getMessages();
  const skipToMain = locale === 'en' ? 'Skip to main content' : '메인 콘텐츠로 이동';

  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProvider>
        <a href="#main-content" className="skip-to-main">
          {skipToMain}
        </a>
        <Header />
        <main id="main-content" className="flex-1">
          <Suspense fallback={<PageLoader />}>{children}</Suspense>
        </main>
        <Suspense>
          <Footer />
        </Suspense>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
