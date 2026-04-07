'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
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
  const t = useTranslations('checkout');
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
        setError(t('loadModuleError'));
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
      } catch (err) {
        console.error('Toss widget render error:', err);
      }
    }
    void renderWidgets();
  }, [widgets]);

  async function handlePayment() {
    setError(null);

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
    if (!shippingAddress || !shippingPostalCode) {
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

        {/* Toss widget containers */}
        {loading && (
          <div className="mb-4 flex h-32 items-center justify-center rounded-2xl border border-gray-200 bg-white">
            <span className="text-sm text-gray-400">{t('loadingModule')}</span>
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
          {submitting ? t('processingShort') : t('payNow')}
        </button>
      </div>
    </div>
  );
}
