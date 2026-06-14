'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { cancelLandingOrder } from '@/app/actions/checkout';
import { sessionGet } from '@/lib/storage';

interface PendingCheckoutSession {
  orderId: string;
  checkoutToken: string;
}

/**
 * 카트(다품목) 결제 실패/취소 페이지.
 *
 * 단건 [artworkId]/fail/FailClient의 로직을 복제하되, artworkId path param이 없으므로
 * checkoutToken/orderId는 URL 또는 orderId 키 세션 캐시로만 복원한다. pending_payment
 * 주문은 진입 즉시 cancelLandingOrder로 정리한다 (cancelLandingOrder가 토큰 누락 시
 * 체크아웃 쿠키로 폴백하므로 orderId만 있으면 충분).
 *
 * `code`/`message`/`orderId`는 server `searchParams`가 아닌 브라우저 URL의
 * `window.location.search`에서 직접 읽는다 (Next.js 16 미들웨어 rewrite query 유실 회귀 방지).
 */
export default function FailClient() {
  const t = useTranslations('checkout');
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
    const code = sp.get('code') ?? '';
    const message = sp.get('message') ?? '';
    const storedCheckout = orderId
      ? sessionGet<PendingCheckoutSession>(`saf:checkout:${orderId}`)
      : null;
    const landingOrderId = orderId || storedCheckout?.orderId || '';
    const checkoutToken = sp.get('checkoutToken') ?? storedCheckout?.checkoutToken ?? '';
    // SSR엔 window가 없어 client mount 후에만 URL 파싱 가능 — effect 초기화가 정당.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setInfo({ code, message, orderId: landingOrderId });
    // pending_payment 주문 자동 정리. checkoutToken 누락 시 서버가 체크아웃 쿠키로 폴백.
    if (landingOrderId) {
      void cancelLandingOrder(landingOrderId, checkoutToken).catch(() => {});
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
            <LinkButton href="/checkout" variant="primary" size="sm" className="w-full">
              {t('retryPayment')}
            </LinkButton>
            <Link href="/cart" className="text-sm text-charcoal-soft underline hover:text-charcoal">
              {t('backToArtworkPage')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
