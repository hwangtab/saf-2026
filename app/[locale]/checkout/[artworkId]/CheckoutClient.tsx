'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';
import { CreditCard, Landmark, type LucideIcon } from 'lucide-react';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee, SHIPPING_THRESHOLD } from '@/lib/integrations/toss/config';
import { createOrder, cancelPendingOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfoHandle } from './BuyerInfoForm';
import { PaymentBrandLogo, type BrandKind } from './PaymentBrandLogo';
import TrustBadges from '@/components/features/TrustBadges';
import CheckoutTrustNotice from '@/components/features/CheckoutTrustNotice';
import { trackEvent } from '@/lib/analytics/track';
import { sessionSet } from '@/lib/storage';

/**
 * 결제 옵션 — 각 버튼의 cardOptions에 따라 Toss 결제창이 분기.
 *
 * - CARD: cardOptions undefined → 통합결제창(picker, flowMode='DEFAULT'). 카드사 선택 UI를
 *   별도로 만들지 않으므로 SDK가 picker를 띄워 사용자가 카드사를 고르도록 위임.
 * - KAKAOPAY/TOSSPAY/NAVERPAY: `card: { flowMode: 'DIRECT', easyPay: '한국어 enum' }`로
 *   해당 간편결제 자체창 직행. easyPay 영문 enum('KAKAOPAY' 등)은 Toss 검증 단계에서 거부됨.
 * - TRANSFER: 토스 퀵계좌이체 (method: 'TRANSFER'). 카드와 동일 파이프라인 —
 *   실시간 출금 후 DONE으로 즉시 결제 완료. 가상계좌(WAITING_FOR_DEPOSIT) 아님.
 *
 * saf202i818 MID 자체창 직행은 토스페이먼츠 결제연동팀 한지형부장 회신(2026-05-09)으로
 * 활성화 — 테스트-라이브 sync 이슈 해결됨. 가상계좌는 별도 미계약(에러 2003) 제외.
 */
type PaymentChoice = 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY' | 'TRANSFER';

type KoBrand = Extract<BrandKind, 'kakaopay' | 'tosspay' | 'naverpay'> | null;

type EasyPayKo = '카카오페이' | '토스페이' | '네이버페이';

type PendingCheckoutSession = {
  orderId: string;
  checkoutToken: string;
  currency: 'KRW' | 'USD';
};

function rememberPendingCheckout(artworkId: string, orderId: string, checkoutToken: string) {
  const payload: PendingCheckoutSession = { orderId, checkoutToken, currency: 'KRW' };
  sessionSet(`saf:checkout:${orderId}`, payload);
  sessionSet(`saf:checkout:latest:${artworkId}`, payload);
}

interface CardOptions {
  flowMode: 'DIRECT';
  easyPay: EasyPayKo;
}

interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay' | 'methodTransfer';
  /** 브랜드 로고 렌더링 식별자 — null이면 텍스트 라벨 사용 */
  brand: KoBrand;
  /** 브랜드 로고가 없는 수단(카드·계좌이체)의 단색 아이콘 — 행 시각 균형 통일 */
  icon?: LucideIcon;
  /** Toss SDK v2 requestPayment의 method. 간편결제 4종은 'CARD'+cardOptions, 퀵계좌이체는 'TRANSFER'. */
  tossMethod: 'CARD' | 'TRANSFER';
  /** Toss SDK v2 자체창 직행 옵션. undefined면 통합결제창 (DEFAULT). */
  cardOptions?: CardOptions;
}

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
  currency: 'KRW';
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
  currency: 'KRW';
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

const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  { value: 'CARD', labelKey: 'methodCard', brand: null, icon: CreditCard, tossMethod: 'CARD' },
  {
    value: 'TRANSFER',
    labelKey: 'methodTransfer',
    brand: null,
    icon: Landmark,
    tossMethod: 'TRANSFER',
  },
  {
    value: 'KAKAOPAY',
    labelKey: 'methodKakaopay',
    brand: 'kakaopay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '카카오페이' },
  },
  {
    value: 'TOSSPAY',
    labelKey: 'methodTosspay',
    brand: 'tosspay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '토스페이' },
  },
  {
    value: 'NAVERPAY',
    labelKey: 'methodNaverpay',
    brand: 'naverpay',
    tossMethod: 'CARD',
    cardOptions: { flowMode: 'DIRECT', easyPay: '네이버페이' },
  },
];

/**
 * 한국어 체크아웃 클라이언트.
 * Toss SDK v2 `payment.requestPayment()` 결제창 (saf202i818 MID, API 개별 연동 키).
 *
 * Flow:
 *   1. createOrder — DB에 pending_payment 주문 생성 (metadata.payment_provider='domestic')
 *   2. loadTossPayments(clientKey).payment({ customerKey: orderNo })
 *   3. payment.requestPayment({ method: 'CARD', successUrl, failUrl, ... })
 *      → Toss-hosted 통합결제창에서 사용자가 카드/간편결제 선택
 *   4. Toss가 결제 완료 후 successUrl(우리 success page)로 redirect
 *   5. SuccessClient가 /api/payments/toss/confirm 호출 → 승인 완료
 *
 * 사용자가 결제창 닫으면 USER_CANCEL 코드로 reject — 주문은 cancelPendingOrder로 정리.
 */
export default function CheckoutClient({
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
  const totalAmount = price + shippingFee;

  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buyerInfoRef = useRef<BuyerInfoHandle | null>(null);

  useEffect(() => {
    trackEvent(
      'begin_checkout',
      {
        value: totalAmount,
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
          value: totalAmount,
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
        trackEvent(
          'checkout_error',
          buildCheckoutTrackingParams({
            artworkId,
            artworkTitle,
            artist,
            value: totalAmount,
            currency: 'KRW',
            payment_type: paymentChoice,
            error_code: 'order_create_failed',
            error_message: result.error,
          })
        );
        setError(result.error);
        setSubmitting(false);
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal, checkoutToken } = result;
      createdOrderNo = orderNo;
      rememberPendingCheckout(artworkId, orderNo, checkoutToken);

      const successUrl = `${window.location.origin}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}/checkout/${artworkId}/fail`;

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      // customerKey는 비회원 결제라도 고유 식별자가 필요. ANONYMOUS는 BrandPay 기반
      // 간편결제(TossPay/NaverPay 등)를 통합 picker에서 숨길 수 있어 orderNo 사용.
      // orderNo는 매 결제마다 unique, 50자 이내, 영문/숫자 형식 적합.
      const payment = tossPayments.payment({ customerKey: orderNo });

      // 자체창 직행: PAYMENT_CHOICES의 cardOptions가 있으면 해당 간편결제 자체창으로 직행.
      // CARD는 cardOptions undefined → 통합결제창 (DEFAULT). requestPayment는 redirect 모드
      // (successUrl 동반) → void 반환, 사용자 취소·SDK 에러는 reject되어 catch에서 처리.
      trackEvent(
        'add_payment_info',
        {
          value: serverTotal,
          currency: 'KRW',
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
            value: serverTotal,
            currency: 'KRW',
            payment_type: paymentChoice,
          }),
        }
      );

      const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice);
      if (choice?.tossMethod === 'TRANSFER') {
        await payment.requestPayment({
          method: 'TRANSFER',
          amount: { currency: 'KRW', value: serverTotal },
          orderId: orderNo,
          orderName,
          customerName: buyerName,
          customerEmail: buyerEmail,
          successUrl,
          failUrl,
        });
      } else {
        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: serverTotal },
          orderId: orderNo,
          orderName,
          customerName: buyerName,
          customerEmail: buyerEmail,
          successUrl,
          failUrl,
          ...(choice?.cardOptions && { card: choice.cardOptions }),
        });
      }
      // navigate 진행 중 — 페이지 unload까지 대기
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerEmail).catch((cancelErr) =>
          console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      // SDK v2 에러는 { code, message } 형태. USER_CANCEL은 사용자가 결제창 닫은 경우라 에러 표시 생략.
      const errorObj = err as { code?: string; message?: string };
      const eventName = errorObj?.code === 'USER_CANCEL' ? 'checkout_cancel' : 'checkout_error';
      trackEvent(
        eventName,
        buildCheckoutTrackingParams({
          artworkId,
          artworkTitle,
          artist,
          value: totalAmount,
          currency: 'KRW',
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

        {/* Payment method selector — 5개 옵션을 동일 list row로 통일.
            미술관 작품 라벨처럼 일관된 시각 리듬 + 좌측 selected indicator(primary 바)로
            현재 선택을 고정 위치에서 확인 가능. */}
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
            {PAYMENT_CHOICES.map(({ value, labelKey, brand, icon: Icon }, i) => {
              const selected = paymentChoice === value;
              return (
                <div key={value}>
                  <label
                    className={clsx(
                      'group relative flex w-full items-center gap-4 px-6 py-4 text-left transition-colors',
                      i > 0 && 'border-t border-gray-200',
                      selected ? 'bg-primary-surface' : 'hover:bg-canvas-strong'
                    )}
                  >
                    <input
                      type="radio"
                      name="checkout-payment-method"
                      value={value}
                      checked={selected}
                      onChange={() => setPaymentChoice(value)}
                      aria-label={t(labelKey)}
                      className="sr-only"
                    />
                    {/* 좌측 primary 바 — selected 시 등장 (1px 처리, 미술관 cue) */}
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'absolute left-0 top-0 h-full w-1 transition-colors',
                        selected ? 'bg-primary' : 'bg-transparent'
                      )}
                    />

                    {/* Radio dot */}
                    <span
                      aria-hidden="true"
                      className={clsx(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                        selected ? 'border-primary' : 'border-gray-300 group-hover:border-gray-400'
                      )}
                    >
                      {selected && <span className="h-2.5 w-2.5 rounded-full bg-primary" />}
                    </span>

                    {/* 본문: brand 로고 또는 텍스트 + 옵셔널 caption */}
                    <span className="flex-1 min-w-0 flex items-center justify-between gap-3">
                      {brand ? (
                        <PaymentBrandLogo brand={brand} />
                      ) : (
                        <span
                          className={clsx(
                            'flex items-center gap-2 text-sm font-medium',
                            selected ? 'text-primary-strong' : 'text-charcoal'
                          )}
                        >
                          {Icon && (
                            <Icon
                              aria-hidden="true"
                              className={clsx(
                                'h-5 w-5 shrink-0',
                                selected ? 'text-primary-strong' : 'text-charcoal-soft'
                              )}
                            />
                          )}
                          {t(labelKey)}
                        </span>
                      )}
                    </span>
                  </label>
                </div>
              );
            })}
          </div>

          {paymentChoice === 'TRANSFER' && (
            <div className="border-t border-primary/10 bg-primary-surface px-6 py-4 text-sm leading-relaxed text-charcoal-muted">
              <p className="font-semibold text-charcoal">{t('transferTrustTitle')}</p>
              <p className="mt-1">{t('transferTrustBody')}</p>
            </div>
          )}
        </div>

        {/* Price breakdown — 결제 직전 최종 금액 요약 (번호 단계 밖, 버튼 위) */}
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
              {shippingFee > 0 && (
                <tr>
                  <td colSpan={2} className="pb-2 pt-0 text-xs text-charcoal-soft">
                    {t('freeShippingThresholdHint', {
                      amount: formatPriceForDisplay(SHIPPING_THRESHOLD),
                    })}
                  </td>
                </tr>
              )}
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
          <div
            role="alert"
            className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y"
          >
            {error}
          </div>
        )}

        {/* 매뉴얼 10.6 결제 페이지 신뢰 시그널 — 결제 결심 직전 노출이 본질. 버튼 위 카드 박스. */}
        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <TrustBadges variant="checkout" />
        </div>

        {/* CTA */}
        <Button onClick={handlePayment} loading={submitting} size="lg" className="w-full">
          {submitting ? t('processingShort') : t('payNow')}
        </Button>

        <CheckoutTrustNotice />
      </div>
    </div>
  );
}
