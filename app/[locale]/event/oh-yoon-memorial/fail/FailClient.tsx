'use client';

import { useEffect, useRef, useState } from 'react';
import { Link } from '@/i18n/navigation';
import { cancelEventPendingPayment } from '@/app/actions/event-admin';

export default function FailClient() {
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo({ code, message, orderId });

    if (orderId && code) {
      void cancelEventPendingPayment(orderId, code).then((res) => {
        if (res.ok) {
          setCleanupMessage('결제대기 신청은 취소 처리했습니다.');
        } else if (res.message) {
          setCleanupMessage(res.message);
        }
      });
    }
  }, []);

  return (
    <main className="flex min-h-[60vh] items-center justify-center px-4 text-center">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal-deep">
          결제가 취소되었습니다
        </h1>
        <p className="mt-3 text-charcoal">다시 시도하시려면 신청 페이지로 돌아가 주세요.</p>
        {info.message && <p className="mt-3 text-sm text-charcoal-muted">{info.message}</p>}
        {info.code && <p className="mt-2 text-xs text-charcoal-muted">오류 코드: {info.code}</p>}
        {info.orderId && (
          <p className="mt-2 text-xs text-charcoal-muted">주문번호: {info.orderId}</p>
        )}
        {cleanupMessage && <p className="mt-3 text-sm text-charcoal">{cleanupMessage}</p>}
        <Link
          href="/event/oh-yoon-memorial"
          className="mt-6 inline-block font-semibold text-primary-strong underline"
        >
          신청 페이지로
        </Link>
      </div>
    </main>
  );
}
