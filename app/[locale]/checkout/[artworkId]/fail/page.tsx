import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';

import { Link } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { createSupabaseAdminClient } from '@/lib/auth/server';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ artworkId: string; locale: string }>;
  searchParams: Promise<{ code?: string; message?: string; orderId?: string }>;
}

/**
 * 결제 실패/취소 페이지.
 *
 * Toss가 사용자를 failUrl로 redirect하는 경우(결제창 X, PayPal 취소, 카드 거절 등)에
 * URL의 orderId를 받아 DB의 pending_payment 주문을 즉시 cancelled로 정리.
 *
 * 정리 안 하면 30분간 살아남아 check_artwork_availability RPC가
 * pending_count >= 1로 unique 작품을 unavailable 판정 → 사용자/다른 구매자가
 * 같은 작품을 재구매 못하는 결함 발생.
 *
 * 보안: orderId만으로 cancel하므로 attacker가 임의 orderId로 cancel 시도 가능.
 * 단 status='pending_payment' 조건 일치 시에만 동작하므로 paid/cancelled 주문은 무영향.
 * 최악 케이스 = 정상 진행 중인 주문이 강제 취소 → 사용자가 재시도해야 함 (수익 손실 없음).
 */
async function cancelPendingByOrderId(orderId: string): Promise<void> {
  if (!orderId || typeof orderId !== 'string') return;
  try {
    const supabase = createSupabaseAdminClient();
    await supabase
      .from('orders')
      .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
      .eq('order_no', orderId)
      .eq('status', 'pending_payment');
  } catch (err) {
    console.error('[fail-page] auto-cancel failed:', err);
    // fail page 렌더 자체는 계속 진행
  }
}

export default async function FailPage({ params, searchParams }: Props) {
  const { artworkId } = await params;
  const { code, message, orderId } = await searchParams;
  const t = await getTranslations('checkout');

  // 페이지 진입 즉시 pending_payment 주문 자동 정리 — unique edition 차단 해소
  if (orderId) {
    await cancelPendingByOrderId(orderId);
  }

  return (
    <div className="min-h-screen bg-canvas-soft flex items-center justify-center pt-24 pb-16">
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
              {t('orderIdLabel')}: {orderId}
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
              className="text-sm text-gray-500 underline hover:text-charcoal"
            >
              {t('backToArtworkPage')}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
