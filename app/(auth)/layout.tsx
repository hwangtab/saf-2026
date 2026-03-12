import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import Header from '@/components/common/Header';
import Footer from '@/components/common/Footer';
import PageLoader from '@/components/common/PageLoader';
import PageTransition from '@/components/common/PageTransition';
import AnimationProvider from '@/components/providers/AnimationProvider';
import ToastProvider from '@/components/providers/ToastProvider';

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <AnimationProvider>
        <ToastProvider>
          <a href="#main-content" className="skip-to-main">
            메인 콘텐츠로 이동
          </a>
          <Header />
          <main id="main-content" className="flex-1">
            <PageTransition>
              <Suspense fallback={<PageLoader />}>{children}</Suspense>
            </PageTransition>
          </main>
          <Footer />
        </ToastProvider>
      </AnimationProvider>
    </NextIntlClientProvider>
  );
}
