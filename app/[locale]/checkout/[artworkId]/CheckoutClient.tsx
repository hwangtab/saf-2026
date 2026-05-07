'use client';

import { useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { createOrder, cancelPendingOrder, createBankTransferOrder } from '@/app/actions/checkout';
import BuyerInfoForm from './BuyerInfoForm';
import type { BuyerInfo } from './BuyerInfoForm';

/**
 * 결제 옵션 → SDK v2 `payment.requestPayment()` 파라미터 매핑.
 *
 * - CARD     : 카드/간편결제 통합결제창 (card.flowMode 미지정 = DEFAULT)
 * - KAKAOPAY : card.flowMode='DIRECT' + card.easyPay='KAKAOPAY' → 카카오페이 자체창 직행
 * - TOSSPAY  : card.flowMode='DIRECT' + card.easyPay='TOSSPAY'  → 토스페이 자체창 직행
 * - TRANSFER : Toss 거치지 않음. createBankTransferOrder 직접 호출하여
 *              awaiting_deposit + artwork=reserved 처리. 사용자에게 하드코딩된
 *              NH 농협 계좌번호 안내 (뱅크페이 인증서·앱 설치 UX 회피).
 *
 * 가상계좌는 saf202i818 MID 미계약 (에러 2003), 네이버페이는 심사 중이라 제외.
 */
type PaymentChoice = 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'TRANSFER';

type BrandKind = 'kakaopay' | 'tosspay' | null;

interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodTransfer';
  /** 브랜드 로고 렌더링 식별자 — null이면 텍스트 라벨 사용 */
  brand: BrandKind;
  /** SDK card 옵션 — 직행 라우팅 시에만 지정. 미지정 시 통합결제창. */
  cardOptions?: { flowMode: 'DIRECT'; easyPay: string };
}

interface Props {
  artworkId: string;
  artworkTitle: string;
  artist: string;
  price: number;
  displayPrice: string;
  imageUrl: string;
  clientKey: string;
}

const PAYMENT_CHOICES: PaymentChoiceConfig[] = [
  { value: 'CARD', labelKey: 'methodCard', brand: null },
  { value: 'TRANSFER', labelKey: 'methodTransfer', brand: null },
  {
    value: 'KAKAOPAY',
    labelKey: 'methodKakaopay',
    brand: 'kakaopay',
    cardOptions: { flowMode: 'DIRECT', easyPay: 'KAKAOPAY' },
  },
  {
    value: 'TOSSPAY',
    labelKey: 'methodTosspay',
    brand: 'tosspay',
    cardOptions: { flowMode: 'DIRECT', easyPay: 'TOSSPAY' },
  },
];

/**
 * 브랜드 로고 컴포넌트.
 * 각 사 공식 브랜드 색상 + 텍스트 마크 (단순 wordmark 스타일).
 * Kakao Pay: 카카오 옐로 #FEE500 + 다크 텍스트
 * Toss Pay : 토스 블루 #3182F6 + 화이트 텍스트
 */
function BrandLogo({ brand }: { brand: BrandKind }) {
  if (brand === 'kakaopay') {
    return (
      // 결제 브랜드 wordmark는 자체 brand 무드 모방을 위해 시스템 폰트 사용 — 사이트 본문(Noto Sans KR)과 의도적 분리
      <span
        className="font-bold text-[#3C1E1E]"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
      >
        kakao
        <span className="font-black">pay</span>
      </span>
    );
  }
  if (brand === 'tosspay') {
    return (
      <span
        className="font-bold text-white"
        style={{ fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}
      >
        toss
        <span className="opacity-80">pay</span>
      </span>
    );
  }
  return null;
}

/**
 * 한국어 체크아웃 클라이언트.
 * Toss SDK v2 `payment.requestPayment()` 결제창 (saf202i818 MID, API 개별 연동 키).
 *
 * Flow:
 *   1. createOrder — DB에 pending_payment 주문 생성 (metadata.payment_provider='domestic')
 *   2. loadTossPayments(clientKey).payment({ customerKey: ANONYMOUS })
 *   3. payment.requestPayment({ method: 'CARD', card: { flowMode, easyPay }, ... })
 *      → 통합결제창 또는 간편결제 자체창 직행 (cardOptions에 따라)
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
}: Props) {
  const t = useTranslations('checkout');
  const shippingFee = calculateShippingFee(price);
  const totalAmount = price + shippingFee;

  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CARD');
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
      // 계좌이체(TRANSFER): Toss 거치지 않고 무통장 입금 흐름.
      // createBankTransferOrder가 awaiting_deposit + artwork=reserved 처리 후
      // 우리 success page로 redirect하여 NH 농협 계좌번호 안내.
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
          locale: 'ko',
        });
        if (!result.success) {
          setError(result.error);
          setSubmitting(false);
          return;
        }
        // success page에 method=BANK_TRANSFER로 redirect — confirm 호출 없이 바로 안내
        window.location.href = `${window.location.origin}/checkout/${artworkId}/success?method=BANK_TRANSFER&orderId=${result.orderNo}&amount=${result.totalAmount}`;
        await new Promise(() => {});
        return;
      }

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
        setSubmitting(false);
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal } = result;
      createdOrderNo = orderNo;

      const successUrl = `${window.location.origin}/checkout/${artworkId}/success`;
      const failUrl = `${window.location.origin}/checkout/${artworkId}/fail`;

      const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice) ?? PAYMENT_CHOICES[0];

      const { ANONYMOUS, loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      const payment = tossPayments.payment({ customerKey: ANONYMOUS });

      // requestPayment는 redirect 모드: 성공 시 successUrl로 navigate (void 반환).
      // 사용자 취소·SDK 에러는 reject되어 catch 블록에서 처리.
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: serverTotal },
        orderId: orderNo,
        orderName,
        customerName: buyerName,
        customerEmail: buyerEmail,
        successUrl,
        failUrl,
        ...(choice.cardOptions ? { card: choice.cardOptions } : {}),
      });
      // navigate 진행 중 — 페이지 unload까지 대기
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerInfoRef.current?.buyerEmail ?? '').catch(
          (cancelErr) => console.error('[checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      // SDK v2 에러는 { code, message } 형태. USER_CANCEL은 사용자가 결제창 닫은 경우라 에러 표시 생략.
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

        {/* Payment method selector */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('paymentMethodSelect')}</h3>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {PAYMENT_CHOICES.map(({ value, labelKey, brand }) => {
              const selected = paymentChoice === value;
              // 브랜드 버튼: 항상 브랜드 색상 배경. 선택 시 외곽 ring으로 강조
              if (brand === 'kakaopay') {
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentChoice(value)}
                    aria-label={t(labelKey)}
                    className={clsx(
                      'rounded-xl py-3 text-base transition-shadow flex items-center justify-center bg-[#FEE500]',
                      selected ? 'ring-2 ring-charcoal ring-offset-2 shadow-md' : 'hover:shadow-md'
                    )}
                  >
                    <BrandLogo brand={brand} />
                  </button>
                );
              }
              if (brand === 'tosspay') {
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setPaymentChoice(value)}
                    aria-label={t(labelKey)}
                    className={clsx(
                      'rounded-xl py-3 text-base transition-shadow flex items-center justify-center bg-[#3182F6]',
                      selected ? 'ring-2 ring-charcoal ring-offset-2 shadow-md' : 'hover:shadow-md'
                    )}
                  >
                    <BrandLogo brand={brand} />
                  </button>
                );
              }
              // 일반 버튼 (카드/계좌이체): 기존 outline 스타일 유지
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setPaymentChoice(value)}
                  className={clsx(
                    'rounded-xl border-2 py-3 text-sm font-medium transition-colors',
                    selected
                      ? 'border-primary bg-primary-surface text-primary'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  )}
                >
                  {t(labelKey)}
                </button>
              );
            })}
          </div>
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
