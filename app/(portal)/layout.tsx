import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import ToastProvider from '@/components/providers/ToastProvider';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <ToastProvider>
        <a href="#portal-content" className="skip-to-main">
          메인 콘텐츠로 이동
        </a>
        <div id="portal-content">{children}</div>
      </ToastProvider>
    </NextIntlClientProvider>
  );
}
