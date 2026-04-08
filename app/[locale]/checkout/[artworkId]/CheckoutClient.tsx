'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { formatPriceForDisplay } from '@/lib/utils';
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

declare global {
  interface Window {
    TossPayments?: (clientKey: string) => {
      requestPayment(
        method: string,
        params: {
          amount: number;
          orderId: string;
          orderName: string;
          successUrl: string;
          failUrl: string;
          customerName?: string;
          customerEmail?: string;
          flowMode?: string;
        }
      ): Promise<void>;
    };
  }
}

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  locale: 'ko' | 'en';
}

export default function CheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
  locale,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalAmount = price + shippingFee;

  const [sdkReady, setSdkReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buyerInfoRef = useRef<BuyerInfo | null>(null);

  // Load TossPayments v1 결제창 SDK via script tag
  useEffect(() => {
    if (window.TossPayments) {
      setSdkReady(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://js.tosspayments.com/v1/payment';
    script.onload = () => setSdkReady(true);
    script.onerror = () => setError(t('loadModuleError'));
    document.head.appendChild(script);
  }, [t]);

  async function handlePayment() {
    setError(null);
    let createdOrderNo: string | null = null;

    const clientKey = process.env.NEXT_PUBLIC_TOSS_CLIENT_KEY;
    if (!clientKey || !window.TossPayments) {
      setError(t('loadModuleError'));
      return;
    }

    const buyerInfo = buyerInfoRef.current;
    if (!buyerInfo) {
      setError(t('errorBuyerInfoRequired'));
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
      setError(t('errorBuyerFieldsRequired'));
      return;
    }
    if (!shippingAddress || !shippingPostalCode || !shippingAddressDetail) {
      setError(t('errorShippingAddressRequired'));
      return;
    }
    if (!shippingName || !shippingPhone) {
      setError(t('errorRecipientRequired'));
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
      createdOrderNo = orderNo;

      // 2. Open Toss payment window via v1 SDK
      const localePrefix = locale === 'en' ? '/en' : '';
      const successUrl = `${window.location.origin}${localePrefix}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}${localePrefix}/checkout/${artworkId}/fail`;

      const tossPayments = window.TossPayments(clientKey);
      await tossPayments.requestPayment('카드', {
        amount: totalAmount,
        orderId: orderNo,
        orderName,
        successUrl,
        failUrl,
        customerName: buyerName,
        customerEmail: buyerEmail,
      });
    } catch (err: unknown) {
      // 결제창 에러/취소 시 pending 주문 즉시 취소
      if (createdOrderNo) {
        void cancelPendingOrder(createdOrderNo);
      }
      const tossErr = err as { code?: string; message?: string } | null;
      if (tossErr?.code === 'USER_CANCEL' || tossErr?.code === 'PAY_PROCESS_CANCELED') return;
      setError(tossErr?.message ?? t('errorPayment'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-8">
        {/* Back button */}
        <Link
          href={`/artworks/${artworkId}`}
          className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-charcoal"
        >
          <span aria-hidden="true">←</span>
          {t('backToArtwork')}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>

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
          <BuyerInfoForm ref={buyerInfoRef} />
        </div>

        {/* Price breakdown */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('orderSummaryTitle')}</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">{t('artworkAmountLabel')}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {formatPriceForDisplay(price)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">{t('shippingFee')}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {shippingFee === 0 ? t('freeShipping') : formatPriceForDisplay(shippingFee)}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-charcoal">{t('totalAmount')}</td>
                <td className="py-2 text-right text-lg font-bold text-primary-a11y">
                  {formatPriceForDisplay(totalAmount)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        )}

        {/* CTA */}
        <button
          type="button"
          onClick={handlePayment}
          disabled={!sdkReady || submitting}
          className="w-full rounded-xl bg-primary py-4 text-base font-bold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? t('processingShort') : t('payNow')}
        </button>
      </div>
    </div>
  );
}
