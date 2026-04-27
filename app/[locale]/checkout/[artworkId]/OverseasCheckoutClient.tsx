'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { krwToUsd, formatUsd } from '@/lib/utils/currency';
import { createOrder, cancelPendingOrder, initiatePayment } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
}

/**
 * 영문(en) 체크아웃 클라이언트 — PayPal via Toss saf202719y MID.
 *
 * Flow:
 *   1. createOrder(locale='en') — pending_payment 주문 생성, metadata에 usd_amount(시점 환산) 저장
 *   2. initiatePayment(locale='en') — Toss /v1/payments
 *      - method=FOREIGN_EASY_PAY, provider=PAYPAL, currency=USD
 *      - amount = krwToUsd(KRW total)
 *   3. window.location.href = checkoutUrl → Toss-hosted PayPal 결제 페이지
 *   4. PayPal에서 결제 완료 후 successUrl로 redirect
 *   5. SuccessClient → /api/payments/toss/confirm — provider='overseas'로 USD 검증
 *
 * 환율 정책: NEXT_PUBLIC_KRW_USD_RATE 환경변수 (기본 1400). 환산 USD 값은
 * createOrder 시점에 metadata.usd_amount로 시점 고정되어 confirm 단계에서 변동 영향 X.
 */
export default function OverseasCheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalKrw = price + shippingFee;
  const usdItem = krwToUsd(price);
  const usdShipping = krwToUsd(shippingFee);
  const usdTotal = krwToUsd(totalKrw);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyerInfoRef = useRef<BuyerInfo | null>(null);

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
    if (!shippingAddress || !shippingPostalCode || !shippingAddressDetail) {
      setError(t('errorShippingAddressRequired'));
      return;
    }
    if (!shippingName || !shippingPhone) {
      setError(t('errorRecipientRequired'));
      return;
    }

    setSubmitting(true);
    let createdOrderNo: string | null = null;

    try {
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
        locale: 'en',
      });

      if (!result.success) {
        setError(result.error);
        setSubmitting(false);
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal } = result;
      createdOrderNo = orderNo;

      const successUrl = `${window.location.origin}/en/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}/en/checkout/${artworkId}/fail`;

      // method/easyPay는 무시됨 — initiatePayment 안에서 locale='en'이면
      // method=FOREIGN_EASY_PAY + provider=PAYPAL + currency=USD로 강제됨.
      const payResult = await initiatePayment({
        method: 'FOREIGN_EASY_PAY',
        orderNo,
        orderName,
        totalAmount: serverTotal,
        buyerName,
        buyerEmail,
        successUrl,
        failUrl,
        locale: 'en',
      });

      if (!payResult.success) {
        cancelPendingOrder(orderNo, buyerEmail).catch((err) =>
          console.error('[checkout] cancelPendingOrder failed:', err)
        );
        setError(payResult.error);
        setSubmitting(false);
        return;
      }

      window.location.href = payResult.checkoutUrl;
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerInfoRef.current?.buyerEmail ?? '').catch(
          (cancelErr) => console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      setError((err as Error)?.message ?? t('errorPayment'));
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-canvas-soft">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
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
              <p className="mt-1 text-lg font-bold text-primary-a11y">{formatUsd(usdItem)}</p>
              <p className="text-xs text-gray-500">{displayPrice} (KRW reference)</p>
            </div>
          </div>
        </div>

        {/* Buyer / shipping form */}
        <div className="mb-6">
          <BuyerInfoForm ref={buyerInfoRef} />
        </div>

        {/* Price breakdown — USD primary, KRW reference */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('orderSummaryTitle')}</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">{t('artworkAmountLabel')}</td>
                <td className="py-2 text-right">
                  <div className="font-medium text-charcoal">{formatUsd(usdItem)}</div>
                  <div className="text-xs text-gray-500">{formatPriceForDisplay(price)}</div>
                </td>
              </tr>
              <tr>
                <td className="py-2 text-gray-600">{t('shippingFee')}</td>
                <td className="py-2 text-right">
                  <div className="font-medium text-charcoal">
                    {shippingFee === 0 ? t('freeShipping') : formatUsd(usdShipping)}
                  </div>
                  {shippingFee !== 0 && (
                    <div className="text-xs text-gray-500">
                      {formatPriceForDisplay(shippingFee)}
                    </div>
                  )}
                </td>
              </tr>
              <tr>
                <td className="py-2 font-bold text-charcoal">{t('totalAmount')}</td>
                <td className="py-2 text-right">
                  <div className="text-lg font-bold text-primary-a11y">{formatUsd(usdTotal)}</div>
                  <div className="text-xs text-gray-500">{formatPriceForDisplay(totalKrw)}</div>
                </td>
              </tr>
            </tbody>
          </table>
          <p className="mt-3 text-xs text-gray-500">
            International payment processed via PayPal in USD. Exchange rate is fixed at order time.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y">
            {error}
          </div>
        )}

        {/* CTA */}
        <Button onClick={handlePayment} loading={submitting} size="lg" className="w-full">
          {submitting ? t('processingShort') : t('payWithPaypal')}
        </Button>
      </div>
    </div>
  );
}
