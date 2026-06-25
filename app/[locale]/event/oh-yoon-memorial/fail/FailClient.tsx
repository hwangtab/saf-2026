'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import { cancelEventPendingPayment } from '@/app/actions/event-admin';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

export default function FailClient() {
  const t = useTranslations('event.ohYoonMemorial');
  const cancelledRef = useRef(false);
  const [info, setInfo] = useState<{ code: string; message: string; orderId: string }>({
    code: '',
    message: '',
    orderId: '',
  });
  const [cleanupMessage, setCleanupMessage] = useState<string | null>(null);

  useEffect(() => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    const orderId = sp.get('orderId') ?? '';
    const code = sp.get('code') ?? '';
    const message = sp.get('message') ?? '';
    // SSR에는 window가 없어 client mount 후에만 URL 파싱 가능하다.

    setInfo({ code, message, orderId });

    if (orderId && code) {
      void cancelEventPendingPayment(orderId, code).then((res) => {
        if (res.ok) {
          setCleanupMessage(t('failCleanupCancelled'));
        } else if (res.message) {
          setCleanupMessage(res.message);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main
      className={`flex min-h-screen items-center justify-center bg-canvas-soft px-4 text-center ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal-deep">{t('failTitle')}</h1>
        <p className="mt-3 text-charcoal">{t('failBody')}</p>
        {info.message && <p className="mt-3 text-sm text-charcoal-muted">{info.message}</p>}
        {info.code && (
          <p className="mt-2 text-xs text-charcoal-muted">
            {t('failErrorCodeLabel')}: {info.code}
          </p>
        )}
        {info.orderId && (
          <p className="mt-2 text-xs text-charcoal-muted">
            {t('failOrderNoLabel')}: {info.orderId}
          </p>
        )}
        {cleanupMessage && <p className="mt-3 text-sm text-charcoal">{cleanupMessage}</p>}
        <Link
          href="/event/oh-yoon-memorial"
          className="mt-6 inline-block font-semibold text-primary-strong underline"
        >
          {t('failBackLink')}
        </Link>
      </div>
    </main>
  );
}
