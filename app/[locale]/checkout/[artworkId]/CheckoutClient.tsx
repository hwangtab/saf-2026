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
 * - CARD     : 카드/간편결제 통합결제창 (card 미지정 = DEFAULT 모드)
 * - KAKAOPAY : flowMode='DIRECT' + easyPay='카카오페이' → 카카오페이 자체창 직행
 * - TOSSPAY  : flowMode='DIRECT' + easyPay='토스페이'   → 토스페이 자체창 직행
 * - NAVERPAY : flowMode='DIRECT' + easyPay='네이버페이' → 네이버페이 자체창 직행
 * - TRANSFER : Toss 거치지 않음. createBankTransferOrder 직접 호출하여
 *              awaiting_deposit + artwork=reserved 처리 후 기업은행(IBK) 계좌번호
 *              안내 (뱅크페이 인증서·앱 설치 UX 회피).
 *
 * easyPay 코드는 한국어 (Toss 가이드 명세) — 'KAKAOPAY' 영문이 아닌 '카카오페이'.
 * 가상계좌는 saf202i818 MID 미계약 (에러 2003)이라 제외.
 */
type PaymentChoice = 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY' | 'TRANSFER';

type BrandKind = 'kakaopay' | 'tosspay' | 'naverpay' | null;

interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay' | 'methodTransfer';
  /** 브랜드 로고 렌더링 식별자 — null이면 텍스트 라벨 사용 */
  brand: BrandKind;
  /** SDK card 옵션 — 직행 라우팅 시에만 지정. 미지정 시 통합결제창. */
  cardOptions?: { flowMode: 'DIRECT'; easyPay: '카카오페이' | '토스페이' | '네이버페이' };
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
];

/**
 * 공식 브랜드 자산 (사용자 다운로드, public/images/payment/에 배치).
 * 모두 자체 여백이 거의 없는 trimmed 상태 (Toss는 sharp.trim()으로 후처리).
 * 표시 높이 h-6(24px)로 통일 — 로고 정렬·시각 무게 일치.
 * - KakaoPay : 결제수단 wordmark (121×50)
 * - TossPay  : Toss 공식 wordmark trimmed (3000×910)
 * - NaverPay : Npay 그린 signature (198×66)
 */
const BRAND_ASSETS: Record<
  Exclude<BrandKind, null>,
  { src: string; alt: string; width: number; height: number }
> = {
  kakaopay: { src: '/images/payment/kakaopay.png', alt: 'KakaoPay', width: 121, height: 50 },
  tosspay: { src: '/images/payment/tosspay.png', alt: 'Toss', width: 3000, height: 910 },
  naverpay: { src: '/images/payment/naverpay.svg', alt: 'NaverPay', width: 198, height: 66 },
};

function BrandLogo({ brand }: { brand: BrandKind }) {
  if (!brand) return null;
  const asset = BRAND_ASSETS[brand];
  return (
    <SafeImage
      src={asset.src}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className="h-6 w-auto object-contain"
    />
  );
}

/**
 * 한국어 체크아웃 클라이언트.
 * Toss SDK v2 `payment.requestPayment()` 결제창 (saf202i818 MID, API 개별 연동 키).
 *
 * Flow:
 *   1. createOrder — DB에 pending_payment 주문 생성 (metadata.payment_provider='domestic')
 *   2. loadTossPayments(clientKey).payment({ customerKey: orderNo })
 *   3. payment.requestPayment({ method: 'CARD', card?, successUrl, failUrl, ... })
 *      → cardOptions 있으면 자체창 직행, 없으면 통합결제창
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
      // 우리 success page로 redirect하여 기업은행(IBK) 계좌번호 안내.
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

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      // customerKey는 비회원 결제라도 고유 식별자 필요. orderNo는 매 결제마다 unique
      // (영문/숫자 조합, 50자 이내) → 그대로 customerKey로 사용 가능. 자체창 직행
      // 모드는 ANONYMOUS 키로는 동작 안 함 (Toss 가이드 명세).
      const payment = tossPayments.payment({ customerKey: orderNo });

      // requestPayment는 redirect 모드 (successUrl 동반) → void 반환, 사용자 취소·
      // SDK 에러는 reject되어 catch 블록에서 처리.
      // card 객체는 cardOptions가 있을 때만 (직행 라우팅), 없으면 통합결제창 DEFAULT.
      await payment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: serverTotal },
        orderId: orderNo,
        orderName,
        customerName: buyerName,
        customerEmail: buyerEmail,
        // Toss SDK는 '-' 없는 숫자만 받음 (8~15자)
        customerMobilePhone: buyerPhone.replace(/[^0-9]/g, ''),
        successUrl,
        failUrl,
        ...(choice.cardOptions
          ? {
              card: {
                useEscrow: false,
                useCardPoint: false,
                useAppCardOnly: false,
                ...choice.cardOptions,
              },
            }
          : {}),
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

        {/* Payment method selector — 5개 옵션을 동일 list row로 통일.
            미술관 작품 라벨처럼 일관된 시각 리듬 + 좌측 selected indicator(primary 바)로
            현재 선택을 고정 위치에서 확인 가능. */}
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
              const description = value === 'TRANSFER' ? t('transferDescription') : null;
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
                        <BrandLogo brand={brand} />
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
