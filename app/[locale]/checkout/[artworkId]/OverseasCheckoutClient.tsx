'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { krwToUsd, formatUsd } from '@/lib/utils/currency';
import {
  createOrder,
  cancelPendingOrder,
  initiatePayment,
  createBankTransferOrder,
} from '@/app/actions/checkout';
import { sessionSet } from '@/lib/storage';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfoHandle } from './BuyerInfoForm';
import { PaymentBrandLogo, type BrandKind } from './PaymentBrandLogo';
import TrustBadges from '@/components/features/TrustBadges';
import CheckoutTrustNotice from '@/components/features/CheckoutTrustNotice';
import { trackEvent } from '@/lib/analytics/track';

/**
 * 영문(en) 체크아웃 옵션. 결제수단별 buyer 자격이 다르므로 caption으로 명시:
 *
 * - PAYPAL    : Toss FOREIGN_EASY_PAY + USD. 해외 PayPal 계정만 (한국 PayPal은
 *               PayPal 정책상 한국→한국 차단). caption "International accounts only".
 * - CARD      : Toss SDK v2 통합결제창 — 한국 카드 + 외국 카드 (다국어 결제창).
 *               KRW 결제. 한국 PayPal 사용자가 영문 페이지에서 우회 가능한 경로.
 * - KAKAOPAY/TOSSPAY/NAVERPAY : Toss 통합결제창 picker. 한국 거주 buyer 또는
 *               한국 간편결제 보유 해외 거주자.
 * - TRANSFER  : 기업은행(IBK) 무통장 입금. 해외에서 SWIFT로 한국 계좌 송금하는 건
 *               $10~50 수수료라 작품 가격대에 비합리적. 실질적으로 한국 계좌
 *               보유자(국내 거주자 + 해외 거주 한국인 diaspora) 한정.
 *               caption "Korean bank accounts only".
 *
 * 직행(`flowMode='DIRECT'`): saf202i818 MID 활성화(2026-05-09)로 KAKAOPAY/TOSSPAY/NAVERPAY는
 * 자체창 직행. CARD는 카드사 선택 UI 없으므로 통합결제창(DEFAULT) 유지.
 */
type EnPaymentChoice = 'PAYPAL' | 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY' | 'TRANSFER';

type EnBrand = Extract<BrandKind, 'kakaopay' | 'tosspay' | 'naverpay' | 'paypal'> | null;

type EasyPayKo = '카카오페이' | '토스페이' | '네이버페이';

interface CardOptions {
  flowMode: 'DIRECT';
  easyPay: EasyPayKo;
}

interface PaymentChoiceConfig {
  value: EnPaymentChoice;
  labelKey:
    | 'methodPaypal'
    | 'methodCard'
    | 'methodKakaopay'
    | 'methodTosspay'
    | 'methodNaverpay'
    | 'methodTransfer';
  brand: EnBrand;
  /** Toss SDK v2 자체창 직행 옵션. CARD/PAYPAL/TRANSFER는 별도 흐름이라 undefined. */
  cardOptions?: CardOptions;
}

const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  { value: 'PAYPAL', labelKey: 'methodPaypal', brand: 'paypal' },
  { value: 'CARD', labelKey: 'methodCard', brand: null },
  {
    value: 'KAKAOPAY',
    labelKey: 'methodKakaopay',
    brand: 'kakaopay',
    cardOptions: { flowMode: 'DIRECT', easyPay: '카카오페이' },
  },
  {
    value: 'TOSSPAY',
    labelKey: 'methodTosspay',
    brand: 'tosspay',
    cardOptions: { flowMode: 'DIRECT', easyPay: '토스페이' },
  },
  {
    value: 'NAVERPAY',
    labelKey: 'methodNaverpay',
    brand: 'naverpay',
    cardOptions: { flowMode: 'DIRECT', easyPay: '네이버페이' },
  },
  { value: 'TRANSFER', labelKey: 'methodTransfer', brand: null },
];

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  clientKey: string;
  prefillName?: string;
  prefillEmail?: string;
}

function buildCheckoutGa4Params(input: {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  value: number;
  currency: 'KRW' | 'USD';
  payment_type?: string;
}) {
  return {
    value: input.value,
    currency: input.currency,
    ...(input.payment_type ? { payment_type: input.payment_type } : {}),
    items: [
      {
        item_id: input.artworkId,
        item_name: input.artworkTitle,
        item_brand: input.artist,
        item_category: 'artwork',
        price: input.value,
        quantity: 1,
      },
    ],
  };
}

function buildCheckoutTrackingParams(input: {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  value: number;
  currency: 'KRW' | 'USD';
  payment_type?: string;
  error_code?: string;
  error_message?: string;
}) {
  return {
    value: input.value,
    currency: input.currency,
    artwork_id: input.artworkId,
    artwork_title: input.artworkTitle,
    artist: input.artist,
    payment_type: input.payment_type ?? null,
    error_code: input.error_code ?? null,
    error_message: input.error_message ? input.error_message.slice(0, 120) : null,
  };
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
  prefillName,
  prefillEmail,
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalKrw = price + shippingFee;
  const usdTotal = krwToUsd(totalKrw);

  const [paymentChoice, setPaymentChoice] = useState<EnPaymentChoice>('PAYPAL');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyerInfoRef = useRef<BuyerInfoHandle | null>(null);

  useEffect(() => {
    trackEvent(
      'begin_checkout',
      {
        value: totalKrw,
        currency: 'KRW',
        artwork_id: artworkId,
        artwork_title: artworkTitle,
        artist,
      },
      {
        ga4Params: buildCheckoutGa4Params({
          artworkId,
          artworkTitle,
          artist,
          value: totalKrw,
          currency: 'KRW',
        }),
      }
    );
    // 마운트 1회 — artworkId 변경은 페이지 재마운트
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handlePayment() {
    setError(null);

    const handle = buyerInfoRef.current;
    if (!handle || !handle.validate()) return; // 폼이 인라인 에러+첫 필드 focus 처리

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
    } = handle.getValues();

    // 결제 후 주문조회(게스트)에서 이메일 재입력 없이 자동조회하도록 sessionStorage에 보관.
    // orderNo는 success가 URL로 넘기고, 상세 조회 권한은 이 이메일로 서버 검증(URL 노출 없음).
    sessionSet('saf:lastBuyerEmail', buyerEmail);

    setSubmitting(true);
    let createdOrderNo: string | null = null;

    try {
      // 무통장 입금(TRANSFER): Toss 거치지 않고 IBK 계좌번호 안내. createOrder
      // 흐름과 별도. createBankTransferOrder가 awaiting_deposit + reserved 처리.
      // KRW 결제이므로 success page에 currency=KRW 명시.
      if (paymentChoice === 'TRANSFER') {
        const result = await createBankTransferOrder({
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
          trackEvent(
            'checkout_error',
            buildCheckoutTrackingParams({
              artworkId,
              artworkTitle,
              artist,
              value: totalKrw,
              currency: 'KRW',
              payment_type: paymentChoice,
              error_code: 'bank_transfer_order_failed',
              error_message: result.error,
            })
          );
          setError(result.error);
          setSubmitting(false);
          return;
        }
        // 성공 시 서버 액션이 직접 redirect — 이 줄 이후에는 도달하지 않음.
        return;
      }

      // createOrder의 locale은 metadata.payment_provider 결정용
      // (en → 'overseas'/saf202719y/USD, ko → 'domestic'/saf202i818/KRW).
      // PayPal만 'overseas'(USD), 그 외(Card/easyPay)는 'domestic'(KRW)으로 저장해야
      // confirm 단계에서 paymentKey와 provider 일치.
      const orderLocale = paymentChoice === 'PAYPAL' ? 'en' : 'ko';
      const successCurrency = paymentChoice === 'PAYPAL' ? 'USD' : 'KRW';

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
        locale: orderLocale,
      });

      if (!result.success) {
        trackEvent(
          'checkout_error',
          buildCheckoutTrackingParams({
            artworkId,
            artworkTitle,
            artist,
            value: paymentChoice === 'PAYPAL' ? usdTotal : totalKrw,
            currency: paymentChoice === 'PAYPAL' ? 'USD' : 'KRW',
            payment_type: paymentChoice,
            error_code: 'order_create_failed',
            error_message: result.error,
          })
        );
        setError(result.error);
        setSubmitting(false);
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal } = result;
      createdOrderNo = orderNo;

      const successUrl = `${window.location.origin}/en/checkout/${artworkId}/success?currency=${successCurrency}`;
      const failUrl = `${window.location.origin}/en/checkout/${artworkId}/fail`;
      const analyticsValue = paymentChoice === 'PAYPAL' ? krwToUsd(serverTotal) : serverTotal;
      trackEvent(
        'add_payment_info',
        {
          value: analyticsValue,
          currency: successCurrency,
          payment_type: paymentChoice,
          artwork_id: artworkId,
          artwork_title: artworkTitle,
          artist,
        },
        {
          ga4Params: buildCheckoutGa4Params({
            artworkId,
            artworkTitle,
            artist,
            value: analyticsValue,
            currency: successCurrency,
            payment_type: paymentChoice,
          }),
        }
      );

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
          trackEvent(
            'checkout_error',
            buildCheckoutTrackingParams({
              artworkId,
              artworkTitle,
              artist,
              value: analyticsValue,
              currency: successCurrency,
              payment_type: paymentChoice,
              error_code: 'payment_initiate_failed',
              error_message: payResult.error,
            })
          );
          setError(payResult.error);
          setSubmitting(false);
          return;
        }

        window.location.href = payResult.checkoutUrl;
        await new Promise(() => {});
        return;
      }

      // Card / 간편결제 흐름: Toss saf202i818 MID + KRW + SDK v2.
      // KAKAOPAY/TOSSPAY/NAVERPAY는 cardOptions로 자체창 직행, CARD는 통합결제창(DEFAULT).
      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: orderNo });

      const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice);
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
        ...(choice?.cardOptions && { card: choice.cardOptions }),
      });
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerEmail).catch((cancelErr) =>
          console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      const errorObj = err as { code?: string; message?: string };
      const eventName = errorObj?.code === 'USER_CANCEL' ? 'checkout_cancel' : 'checkout_error';
      const currency = paymentChoice === 'PAYPAL' ? 'USD' : 'KRW';
      trackEvent(
        eventName,
        buildCheckoutTrackingParams({
          artworkId,
          artworkTitle,
          artist,
          value: paymentChoice === 'PAYPAL' ? usdTotal : totalKrw,
          currency,
          payment_type: paymentChoice,
          error_code: errorObj?.code ?? 'unknown',
          error_message: errorObj?.message,
        })
      );
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
          className="mb-6 inline-flex items-center gap-1 text-sm text-charcoal-soft hover:text-charcoal"
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
              <p className="text-xs text-charcoal-soft">{artist}</p>
              <p className="mt-0.5 font-semibold text-charcoal truncate">{artworkTitle}</p>
              <p className="mt-1 text-lg font-bold text-primary-a11y">{displayPrice}</p>
            </div>
          </div>
        </div>

        {/* Buyer / shipping form */}
        <div className="mb-6">
          <BuyerInfoForm
            ref={buyerInfoRef}
            initialBuyer={{ name: prefillName, email: prefillEmail }}
          />
        </div>

        {/* Price breakdown — KRW lines + USD final (PayPal 결제 시 USD로 청구) */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('paymentAmount')}</h3>
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
          <h3 className="flex items-center gap-2 px-6 pt-6 pb-4 text-base font-semibold text-charcoal">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary-a11y">
              3
            </span>
            {t('paymentMethodSelect')}
          </h3>

          <div
            role="radiogroup"
            aria-label={t('paymentMethodSelect')}
            className="border-t border-gray-200"
          >
            {PAYMENT_CHOICES.map(({ value, labelKey, brand }, i) => {
              const selected = paymentChoice === value;
              const description =
                value === 'PAYPAL'
                  ? t('paypalCaption')
                  : value === 'TRANSFER'
                    ? t('transferDescription')
                    : null;
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
                            selected ? 'text-primary-strong' : 'text-charcoal'
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
          {paymentChoice === 'TRANSFER' && (
            <div className="border-t border-primary/10 bg-primary-surface px-6 py-4 text-sm leading-relaxed text-charcoal-muted">
              <p className="font-semibold text-charcoal">{t('transferTrustTitle')}</p>
              <p className="mt-1">{t('transferTrustBody')}</p>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y"
          >
            {error}
          </div>
        )}

        {/* CTA */}
        <Button onClick={handlePayment} loading={submitting} size="lg" className="w-full">
          {submitting ? t('processingShort') : t('payNow')}
        </Button>

        {/* 매뉴얼 10.6 결제 페이지 신뢰 시그널 — 진품·청약철회·배송·결제보안·작가 직접 출품 5개. */}
        <div className="mt-6">
          <TrustBadges variant="checkout" />
        </div>

        <CheckoutTrustNotice />
      </div>
    </div>
  );
}
