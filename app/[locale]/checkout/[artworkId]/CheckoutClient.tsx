'use client';

import { useEffect, useRef, useState } from 'react';
import { loadTossPayments, ANONYMOUS } from '@tosspayments/tosspayments-sdk';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { formatPriceForDisplay } from '@/lib/utils';
import { createOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  locale: 'ko' | 'en';
}

type TossWidgets = Awaited<ReturnType<Awaited<ReturnType<typeof loadTossPayments>>['widgets']>>;

export default function CheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
  locale,
}: Props) {
  const isKo = locale === 'ko';
  const shippingFee = calculateShippingFee(price);
  const totalAmount = price + shippingFee;

  const [widgets, setWidgets] = useState<TossWidgets | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyerInfoRef = useRef<BuyerInfo | null>(null);

  // Load Toss SDK and initialise widgets
  useEffect(() => {
    async function initWidgets() {
      try {
        const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
        if (!clientKey) throw new Error('Toss client key is not configured');

        const tossPayments = await loadTossPayments(clientKey);
        const w = tossPayments.widgets({ customerKey: ANONYMOUS });
        await w.setAmount({ currency: 'KRW', value: totalAmount });
        setWidgets(w);
      } catch (err) {
        setError(isKo ? '결제 모듈을 불러오는 데 실패했습니다.' : 'Failed to load payment module.');
      } finally {
        setLoading(false);
      }
    }
    void initWidgets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Render Toss widget UI once widgets are ready
  useEffect(() => {
    if (!widgets) return;

    async function renderWidgets() {
      try {
        await widgets!.renderPaymentMethods({
          selector: '#payment-method',
          variantKey: 'DEFAULT',
        });
        await widgets!.renderAgreement({
          selector: '#agreement',
          variantKey: 'AGREEMENT',
        });
      } catch {
        // Widgets may throw if already rendered — safe to ignore
      }
    }
    void renderWidgets();
  }, [widgets]);

  async function handlePayment() {
    setError(null);

    const buyerInfo = buyerInfoRef.current;
    if (!buyerInfo) {
      setError(isKo ? '구매자 정보를 확인해주세요.' : 'Please fill in buyer information.');
      return;
    }

    const {
      buyerName,
      buyerEmail,
      buyerPhone,
      shippingName,
      shippingPhone,
      shippingAddress,
      shippingAddressDetail,
      shippingPostalCode,
      shippingMemo,
    } = buyerInfo;

    if (!buyerName || !buyerEmail || !buyerPhone) {
      setError(
        isKo ? '구매자 이름, 이메일, 연락처는 필수입니다.' : 'Name, email, and phone are required.'
      );
      return;
    }
    if (!shippingAddress || !shippingPostalCode) {
      setError(isKo ? '배송지 주소를 입력해주세요.' : 'Please enter a shipping address.');
      return;
    }
    if (!shippingName || !shippingPhone) {
      setError(isKo ? '수령인 정보를 입력해주세요.' : 'Please enter recipient information.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create order via server action
      const result = await createOrder({
        artworkId,
        buyerName,
        buyerEmail,
        buyerPhone,
        shippingName,
        shippingPhone,
        shippingAddress,
        shippingAddressDetail,
        shippingPostalCode,
        shippingMemo,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      const { orderNo, orderName } = result;

      // 2. Request payment via Toss widget
      const localePrefix = locale === 'en' ? '/en' : '';
      const successUrl = `${window.location.origin}${localePrefix}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}${localePrefix}/checkout/${artworkId}/fail`;

      await widgets!.requestPayment({
        orderId: orderNo,
        orderName,
        successUrl,
        failUrl,
        customerEmail: buyerEmail,
        customerName: buyerName,
      });
    } catch (err: unknown) {
      const tossErr = err as { code?: string; message?: string } | null;
      if (tossErr?.code === 'USER_CANCEL') return;
      setError(
        tossErr?.message ??
          (isKo ? '결제 중 오류가 발생했습니다.' : 'An error occurred during payment.')
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href={`/artworks/${artworkId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal"
        >
          <span aria-hidden="true">←</span>
          {isKo ? '작품 보기' : 'Back to artwork'}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-charcoal">{isKo ? '결제' : 'Checkout'}</h1>

        {/* Artwork summary */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            {imageUrl && (
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                <SafeImage
                  src={imageUrl}
                  alt={artworkTitle}
                  width={96}
                  height={96}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-500">{artist}</p>
              <p className="mt-0.5 font-semibold text-charcoal truncate">{artworkTitle}</p>
              <p className="mt-1 text-lg font-bold text-primary-a11y">{displayPrice}</p>
            </div>
          </div>
        </div>

        {/* Buyer / shipping form */}
        <div className="mb-6">
          <BuyerInfoForm ref={buyerInfoRef} locale={locale} />
        </div>

        {/* Price breakdown */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">
            {isKo ? '결제 금액' : 'Order Summary'}
          </h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">{isKo ? '작품 금액' : 'Item'}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {formatPriceForDisplay(price)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">{isKo ? '배송비' : 'Shipping'}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {shippingFee === 0
                    ? isKo
                      ? '무료'
                      : 'Free'
                    : formatPriceForDisplay(shippingFee)}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-charcoal">{isKo ? '총 결제 금액' : 'Total'}</td>
                <td className="py-2 text-right text-lg font-bold text-primary-a11y">
                  {formatPriceForDisplay(totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Toss widget containers */}
        {loading && (
          <div className="mb-4 flex h-32 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <span className="text-sm text-gray-400">
              {isKo ? '결제 모듈 로딩 중...' : 'Loading payment module...'}
            </span>
          </div>
        )}

        <div id="payment-method" className="mb-4" />
        <div id="agreement" className="mb-6" />

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handlePayment}
          disabled={loading || submitting}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? (isKo ? '처리 중...' : 'Processing...') : isKo ? '결제하기' : 'Pay Now'}
        </button>
      </div>
    </div>
  );
}
