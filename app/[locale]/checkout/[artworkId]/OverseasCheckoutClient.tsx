'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { krwToUsd, formatUsd } from '@/lib/utils/currency';
import { createOrder, cancelPendingOrder, initiatePayment } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';
import { PaymentBrandLogo, type BrandKind } from './PaymentBrandLogo';

/**
 * 영문(en) 체크아웃 옵션 — 한국어 페이지와 거의 동일하지만 PayPal이 추가되고
 * TRANSFER(국내 무통장 입금)는 제외됨.
 *
 * - PAYPAL    : Toss FOREIGN_EASY_PAY + provider=PAYPAL + USD 환산. 해외 PayPal
 *               계정만 결제 가능 (한국 PayPal 계정은 PayPal 정책상 차단).
 * - CARD      : Toss SDK v2 통합결제창 — 한국 카드 + 외국 카드 (다국어 결제창).
 *               KRW 결제. 한국 PayPal 사용자가 영문 페이지에서 우회 가능한 경로.
 * - KAKAOPAY/TOSSPAY/NAVERPAY : Toss 통합결제창 picker. 한국 거주 buyer가 영문
 *               UI 선호하는 경우.
 *
 * 직행(`flowMode='DIRECT'`)은 saf202i818 MID 활성화 후 cardOptions 추가.
 */
type EnPaymentChoice = 'PAYPAL' | 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY';

type EnBrand = Extract<BrandKind, 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal'> | null;

interface PaymentChoiceConfig {
  value: EnPaymentChoice;
  labelKey: 'methodPaypal' | 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay';
  brand: EnBrand;
}

const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  { value: 'PAYPAL', labelKey: 'methodPaypal', brand: 'paypal' },
  { value: 'CARD', labelKey: 'methodCard', brand: null },
  { value: 'KAKAOPAY', labelKey: 'methodKakaopay', brand: 'kakaopay' },
  { value: 'TOSSPAY', labelKey: 'methodTosspay', brand: 'tosspay' },
  { value: 'NAVERPAY', labelKey: 'methodNaverpay', brand: 'naverpay' },
];

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  clientKey: string;
}

/**
 * 영문(en) 체크아웃 클라이언트.
 *
 * Flow (PayPal):
 *   1. createOrder(locale='en') — pending_payment, metadata.usd_amount(시점 환산)
 *   2. initiatePayment(method='FOREIGN_EASY_PAY', locale='en') — Toss saf202719y MID
 *   3. window.location.href = checkoutUrl → Toss-hosted PayPal 페이지
 *   4. PayPal 결제 완료 → successUrl
 *   5. SuccessClient → /api/payments/toss/confirm (provider='overseas', USD 검증)
 *
 * Flow (Card / 간편결제):
 *   1. createOrder(locale='en') — pending_payment, KRW 그대로
 *   2. loadTossPayments(domestic clientKey).payment(...).requestPayment(...)
 *      — Toss SDK v2 통합결제창 (saf202i818 MID, KRW)
 *   3. successUrl로 redirect → SuccessClient → /api/payments/toss/confirm
 *      (provider='domestic', KRW 검증)
 *
 * 환율: NEXT_PUBLIC_KRW_USD_RATE (기본 1400). createOrder 시점 고정.
 */
export default function OverseasCheckoutClient({
  artworkId,
  artworkTitle,
  artist,
  price,
  displayPrice,
  imageUrl,
  clientKey,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalKrw = price + shippingFee;
  const usdTotal = krwToUsd(totalKrw);

  const [paymentChoice, setPaymentChoice] = useState<EnPaymentChoice>('PAYPAL');
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

      // PayPal 흐름: Toss saf202719y MID + USD + redirect
      if (paymentChoice === 'PAYPAL') {
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
        return;
      }

      // Card / 간편결제 흐름: Toss saf202i818 MID + KRW + SDK v2 통합결제창
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: orderNo });

      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: serverTotal },
        orderId: orderNo,
        orderName,
        customerName: buyerName,
        customerEmail: buyerEmail,
        customerMobilePhone: buyerPhone.replace(/[^0-9]/g, ''),
        successUrl,
        failUrl,
      });
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerInfoRef.current?.buyerEmail ?? '').catch(
          (cancelErr) => console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code !== 'USER_CANCEL') {
        setError(errorObj?.message ?? t('errorPayment'));
      }
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
              <p className="mt-1 text-lg font-bold text-primary-a11y">{displayPrice}</p>
            </div>
          </div>
        </div>

        {/* Buyer / shipping form */}
        <div className="mb-6">
          <BuyerInfoForm ref={buyerInfoRef} />
        </div>

        {/* Price breakdown — KRW lines + USD final (PayPal 결제 시 USD로 청구) */}
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
                  {formatPriceForDisplay(totalKrw)}
                </td>
              </tr>
              <tr>
                <td className="py-2 text-caption-meta text-charcoal-soft">PayPal (USD)</td>
                <td className="py-2 text-right text-caption-meta text-charcoal-soft">
                  ≈ {formatUsd(usdTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Payment method selector — 한국어 페이지와 동일한 list rows 패턴 */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <h3 className="px-6 pt-6 pb-4 text-base font-semibold text-charcoal">
            {t('paymentMethodSelect')}
          </h3>

          <div
            role="radiogroup"
            aria-label={t('paymentMethodSelect')}
            className="border-t border-gray-200"
          >
            {PAYMENT_CHOICES.map(({ value, labelKey, brand }, i) => {
              const selected = paymentChoice === value;
              const description = value === 'PAYPAL' ? t('paypalCaption') : null;
              return (
                <div key={value}>
                  <button
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    aria-label={t(labelKey)}
                    onClick={() => setPaymentChoice(value)}
                    className={clsx(
                      'group relative flex w-full items-center gap-4 px-6 py-4 text-left transition-colors',
                      i > 0 && 'border-t border-gray-200',
                      selected ? 'bg-primary-surface' : 'hover:bg-canvas-strong'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'absolute left-0 top-0 h-full w-1 transition-colors',
                        selected ? 'bg-primary' : 'bg-transparent'
                      )}
                    />

                    <span
                      aria-hidden="true"
                      className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-primary' : 'border-gray-300 group-hover:border-gray-400'
                      )}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>

                    <span className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      {brand ? (
                        <PaymentBrandLogo brand={brand} />
                      ) : (
                        <span
                          className={clsx(
                            'text-sm font-medium',
                            selected ? 'text-primary' : 'text-charcoal'
                          )}
                        >
                          {t(labelKey)}
                        </span>
                      )}
                      {description && (
                        <span className="text-caption-meta text-charcoal-soft">{description}</span>
                      )}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* PayPal 선택 시 USD 환산 안내 */}
          {paymentChoice === 'PAYPAL' && (
            <p className="px-6 pb-5 text-caption-meta text-charcoal-soft">{t('paypalUsdNotice')}</p>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y">
            {error}
          </div>
        )}

        {/* CTA */}
        <Button onClick={handlePayment} loading={submitting} size="lg" className="w-full">
          {submitting ? t('processingShort') : t('payNow')}
        </Button>
      </div>
    </div>
  );
}
