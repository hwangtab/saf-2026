import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import ToastProvider from '@/components/providers/ToastProvider';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();
  const t = await getTranslations('nav');

  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProvider>
        <a href="#portal-content" className="skip-to-main">
          {t('skipToMain')}
        </a>
        <div id="portal-content">{children}</div>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
