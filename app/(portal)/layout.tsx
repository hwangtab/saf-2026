import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getMessages } from 'next-intl/server';
import ToastProvider from '@/components/providers/ToastProvider';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) === 'en' ? 'en' : 'ko';
  const messages = await getMessages();
  const skipToMain = locale === 'en' ? 'Skip to main content' : '메인 콘텐츠로 이동';

  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProvider>
        <a href="#portal-content" className="skip-to-main">
          {skipToMain}
        </a>
        <div id="portal-content">{children}</div>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
