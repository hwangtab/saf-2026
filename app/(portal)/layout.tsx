import type { Metadata } from 'next';
import { Suspense } from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import NavigationProgress from '@/components/layout/NavigationProgress';
import ToastProvider from '@/components/providers/ToastProvider';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
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
  );
}
