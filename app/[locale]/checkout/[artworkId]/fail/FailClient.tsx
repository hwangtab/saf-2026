'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { cancelLandingOrder } from '@/app/actions/checkout';

/**
 * 결제 실패/취소 페이지.
 *
 * Toss가 사용자를 failUrl로 redirect할 때(결제창 X, PayPal 취소, 카드 거절 등) URL의
 * `code`/`message`/`orderId`를 **브라우저 URL에서 직접 읽는다**. Next.js 16의 미들웨어
 * rewrite가 default-locale 경로의 server `searchParams`를 떨구는 회귀 때문에 server
 * component에서는 받을 수 없다. orderId로 pending_payment 주문을 즉시 정리해야
 * check_artwork_availability가 unique 작품을 30분간 잠그는 결함을 막는다.
 */
export default function FailClient() {
  const t = useTranslations('checkout');
  const params = useParams();
  const artworkId = String(params.artworkId ?? '');
  const cancelledRef = useRef(false);
  const [info, setInfo] = useState<{ code: string; message: string; orderId: string }>({
    code: '',
    message: '',
    orderId: '',
  });

  useEffect(() => {
    if (cancelledRef.current) return;
    cancelledRef.current = true;
    const sp = new URLSearchParams(window.location.search);
    const orderId = sp.get('orderId') ?? '';
    // SSR엔 window가 없어 client mount 후에만 URL 파싱 가능 — effect 초기화가 정당.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo({ code: sp.get('code') ?? '', message: sp.get('message') ?? '', orderId });
    // 페이지 진입 즉시 pending_payment 주문 자동 정리 — unique edition 차단 해소
    if (orderId) {
      void cancelLandingOrder(orderId).catch(() => {});
    }
  }, []);

  const { code, message, orderId } = info;

  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="rounded-2xl border border-danger/20 bg-white p-10 shadow-sm text-center">
          <p className="text-4xl mb-4">✗</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2">{t('paymentFailed')}</h1>

          {message && <p className="text-sm text-gray-600 mb-3">{message}</p>}
          {code && (
            <p className="text-xs text-charcoal-soft mb-6">
              {t('errorCode')}: {code}
            </p>
          )}
          {orderId && (
            <p className="text-xs text-charcoal-soft mb-6">
              {t('orderNo')}: {orderId}
            </p>
          )}

          <div className="flex flex-col items-center gap-3">
            <LinkButton
              href={`/checkout/${artworkId}`}
              variant="primary"
              size="sm"
              className="w-full"
            >
              {t('retryPayment')}
            </LinkButton>
            <Link
              href={`/artworks/${artworkId}`}
              className="text-sm text-charcoal-soft underline hover:text-charcoal"
            >
              {t('backToArtworkPage')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
