'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { formatPriceForDisplay } from '@/lib/utils';
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  locale: 'ko';
  widgetClientKey: string;
}

type Stage = 'idle' | 'mounting' | 'ready' | 'submitting' | 'mountError';

interface TossWidgetsInstance {
  setAmount(input: { currency: string; value: number }): Promise<void>;
  renderPaymentMethods(input: { selector: string; variantKey: string }): Promise<unknown>;
  renderAgreement(input: { selector: string; variantKey: string }): Promise<unknown>;
  requestPayment(input: {
    orderId: string;
    orderName: string;
    successUrl: string;
    failUrl: string;
    customerName?: string;
    customerEmail?: string;
    customerMobilePhone?: string;
  }): Promise<void>;
}

export default function CheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
  widgetClientKey,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalAmount = price + shippingFee;

  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const buyerInfoRef = useRef<BuyerInfo | null>(null);
  const widgetsRef = useRef<TossWidgetsInstance | null>(null);
  const mountedOnceRef = useRef(false);

  useEffect(() => {
    if (mountedOnceRef.current) return;
    mountedOnceRef.current = true;
    setStage('mounting');

    let cancelled = false;

    (async () => {
      try {
        const { loadTossPayments, ANONYMOUS } = await import('@tosspayments/tosspayments-sdk');
        const tossPayments = await loadTossPayments(widgetClientKey);
        const widgets = tossPayments.widgets({ customerKey: ANONYMOUS });

        await widgets.setAmount({ currency: 'KRW', value: totalAmount });

        await widgets.renderPaymentMethods({
          selector: '#toss-payment-methods',
          variantKey: 'DEFAULT',
        });
        await widgets.renderAgreement({
          selector: '#toss-payment-agreement',
          variantKey: 'AGREEMENT',
        });

        if (cancelled) return;
        widgetsRef.current = widgets as TossWidgetsInstance;
        setStage('ready');
      } catch (err) {
        console.error('[checkout] widget mount failed:', err);
        if (!cancelled) {
          setStage('mountError');
          setError(t('widgetMountFailed'));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Toss widget SDK has no unmount API; we deliberately mount once for the
    // component lifetime. Dynamic amount changes are handled by setAmount in
    // handlePayment, not by re-mounting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayment() {
    setError(null);
    if (stage !== 'ready' || !widgetsRef.current) {
      setError(t('widgetMountFailed'));
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

    setStage('submitting');
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
        locale: 'ko',
      });

      if (!result.success) {
        setError(result.error);
        setStage('ready');
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal } = result;
      createdOrderNo = orderNo;

      // Re-sync widget amount with server-validated total before requestPayment
      await widgetsRef.current.setAmount({ currency: 'KRW', value: serverTotal });

      const successUrl = `${window.location.origin}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}/checkout/${artworkId}/fail`;

      await widgetsRef.current.requestPayment({
        orderId: orderNo,
        orderName,
        successUrl,
        failUrl,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerMobilePhone: buyerPhone.replace(/\D/g, ''),
      });
      // Toss redirects the browser; setStage stays 'submitting' until unload.
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerInfoRef.current?.buyerEmail ?? '').catch(
          (cancelErr) => console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      const message = (err as { message?: string })?.message ?? t('errorPayment');
      // Toss SDK throws a known shape with .code on user cancel — silence those
      const code = (err as { code?: string })?.code;
      if (code === 'USER_CANCEL') {
        setError(null);
      } else {
        setError(message);
      }
      setStage('ready');
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

        {/* Toss widget mount targets */}
        <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-2 shadow-sm">
          <div id="toss-payment-methods" />
          <div id="toss-payment-agreement" />
        </div>

        {(stage === 'mounting' || stage === 'idle') && (
          <p className="mb-4 text-center text-sm text-gray-500">{t('preparingPayment')}</p>
        )}

        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y">
            {error}
          </div>
        )}

        <Button
          onClick={handlePayment}
          loading={stage === 'submitting'}
          disabled={stage !== 'ready' && stage !== 'submitting'}
          size="lg"
          className="w-full"
        >
          {stage === 'submitting' ? t('processingShort') : t('payNow')}
        </Button>
      </div>
    </div>
  );
}
