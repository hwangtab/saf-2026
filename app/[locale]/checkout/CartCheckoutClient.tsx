'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { useCart } from '@/components/providers/CartProvider';
import { getCartArtworks, type CartArtworkInfo } from '@/app/actions/cart-artworks';
import { resolveArtworkImageUrl } from '@/lib/utils/artwork-image';
import SafeImage from '@/components/common/SafeImage';
import { Link } from '@/i18n/navigation';
import Button from '@/components/ui/Button';
import { formatPriceForDisplay } from '@/lib/utils';
import { calculateShippingFee } from '@/lib/integrations/toss/config';
import { createOrder, cancelPendingOrder, createBankTransferOrder } from '@/app/actions/checkout';
import BuyerInfoForm from '../checkout/[artworkId]/BuyerInfoForm';
import type { BuyerInfoHandle } from '../checkout/[artworkId]/BuyerInfoForm';
import { PaymentBrandLogo, type BrandKind } from '../checkout/[artworkId]/PaymentBrandLogo';
import TrustBadges from '@/components/features/TrustBadges';
import CheckoutTrustNotice from '@/components/features/CheckoutTrustNotice';
import { trackEvent } from '@/lib/analytics/track';
import { sessionSet } from '@/lib/storage';

/**
 * 결제 옵션 — 단건 CheckoutClient와 동일한 구성. cardOptions에 따라 Toss 결제창이 분기.
 * 단건 CheckoutClient의 PAYMENT_CHOICES 패턴을 그대로 미러한다.
 */
type PaymentChoice = 'CARD' | 'KAKAOPAY' | 'TOSSPAY' | 'NAVERPAY' | 'TRANSFER';

type KoBrand = Extract<BrandKind, 'kakaopay' | 'tosspay' | 'naverpay'> | null;

type EasyPayKo = '카카오페이' | '토스페이' | '네이버페이';

interface CardOptions {
  flowMode: 'DIRECT';
  easyPay: EasyPayKo;
}

interface PaymentChoiceConfig {
  value: PaymentChoice;
  labelKey: 'methodCard' | 'methodKakaopay' | 'methodTosspay' | 'methodNaverpay' | 'methodTransfer';
  brand: KoBrand;
  cardOptions?: CardOptions;
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

type PendingCheckoutSession = {
  orderId: string;
  checkoutToken: string;
  currency: 'KRW' | 'USD';
};

/**
 * 카트 결제는 단일 artworkId가 없으므로 latest 캐시는 orderNo 키만 사용한다.
 * (단건 success/fail은 artworkId 키도 쓰지만, 카트 success/fail은 URL의 orderId로 복원)
 */
function rememberPendingCheckout(orderId: string, checkoutToken: string) {
  const payload: PendingCheckoutSession = { orderId, checkoutToken, currency: 'KRW' };
  sessionSet(`saf:checkout:${orderId}`, payload);
}

interface Props {
  locale: string;
  clientKey: string;
}

/**
 * 다품목(장바구니) 체크아웃 클라이언트.
 *
 * 단건 CheckoutClient의 Toss 결제 흐름을 그대로 재사용하되 items 배열로 일반화한다:
 *   1. useCart()로 카트 항목 + getCartArtworks로 상세/가격/availability 로드
 *   2. 품절 항목이 있으면 결제 차단(부분 차단 UI) — 제거 후 진행
 *   3. createOrder({ items }) — 서버가 권위값 totalAmount/orderName/checkoutToken 반환
 *   4. loadTossPayments → payment.requestPayment (단건과 동일한 호출)
 *      successUrl/failUrl만 카트용 /checkout/success·/checkout/fail로 지정
 *   5. 결제 성공 시 카트 비우기는 success 페이지에서 처리
 *
 * 보안/토큰/금액 로직은 단건과 동일 — checkoutToken은 rememberPendingCheckout으로
 * sessionStorage에 보관하고 success 페이지가 confirm에 전달한다.
 */
export default function CartCheckoutClient({ clientKey }: Props) {
  const t = useTranslations('checkout');
  const tc = useTranslations('cart');
  const { items, remove, mounted } = useCart();

  const [details, setDetails] = useState<CartArtworkInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>('CARD');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // createOrder가 unavailable[]을 돌려주거나 클라이언트가 품절을 감지했을 때 하이라이트할 ID들
  const [highlightUnavailable, setHighlightUnavailable] = useState<string[]>([]);
  const buyerInfoRef = useRef<BuyerInfoHandle | null>(null);

  const itemIds = items.map((i) => i.artworkId);
  const idsKey = itemIds.join(',');

  useEffect(() => {
    if (!mounted) return;
    if (itemIds.length === 0) {
      setDetails([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    getCartArtworks(itemIds)
      .then((rows) => {
        if (!cancelled) setDetails(rows);
      })
      .catch(() => {
        if (!cancelled) setDetails([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // idsKey가 항목 구성을 대표 — 배열 참조 변화로 인한 과도 재조회 방지.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, idsKey]);

  const detailById = useMemo(() => {
    const map = new Map<string, CartArtworkInfo>();
    for (const d of details) map.set(d.id, d);
    return map;
  }, [details]);

  const subtotal = items.reduce((sum, item) => {
    const info = detailById.get(item.artworkId);
    return sum + (info ? info.price * item.quantity : 0);
  }, 0);
  const shippingFee = calculateShippingFee(subtotal);
  const estimatedTotal = subtotal + shippingFee;
  const soldOutIds = details.filter((d) => d.isAvailable === false).map((d) => d.id);
  const hasSoldOut = soldOutIds.length > 0;

  async function handlePayment() {
    setError(null);
    setHighlightUnavailable([]);

    if (items.length === 0 || hasSoldOut) return;

    const handle = buyerInfoRef.current;
    if (!handle || !handle.validate()) return;

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

    // 결제 후 게스트 주문조회에서 이메일 재입력 없이 자동조회하도록 보관 (단건과 동일).
    sessionSet('saf:lastBuyerEmail', buyerEmail);

    const orderItems = items.map((i) => ({ artworkId: i.artworkId, quantity: i.quantity }));

    setSubmitting(true);
    let createdOrderNo: string | null = null;

    try {
      // 계좌이체(TRANSFER): 단건과 동일하게 Toss 거치지 않고 무통장 입금 흐름.
      // createBankTransferOrder가 awaiting_deposit 처리 후 success 페이지로 직접 redirect.
      if (paymentChoice === 'TRANSFER') {
        const result = await createBankTransferOrder({
          items: orderItems,
          cartCheckout: true,
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
          if (result.unavailable && result.unavailable.length > 0) {
            setHighlightUnavailable(result.unavailable);
          }
          setError(result.error);
          setSubmitting(false);
          return;
        }
        // 성공 시 서버 액션이 직접 redirect — 이 줄 이후 도달하지 않음.
        // 카트 비우기는 무통장 success 랜딩에서 처리.
        return;
      }

      const result = await createOrder({
        items: orderItems,
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
        if (result.unavailable && result.unavailable.length > 0) {
          setHighlightUnavailable(result.unavailable);
        }
        setError(result.error);
        setSubmitting(false);
        return;
      }

      const { orderNo, orderName, totalAmount: serverTotal, checkoutToken } = result;
      createdOrderNo = orderNo;
      rememberPendingCheckout(orderNo, checkoutToken);

      const successUrl = `${window.location.origin}/checkout/success`;
      const failUrl = `${window.location.origin}/checkout/fail`;

      const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
      const tossPayments = await loadTossPayments(clientKey);
      // customerKey는 비회원 결제라도 고유 식별자 필요 — orderNo 사용 (단건과 동일).
      const payment = tossPayments.payment({ customerKey: orderNo });

      trackEvent('add_payment_info', {
        value: serverTotal,
        currency: 'KRW',
        payment_type: paymentChoice,
      });

      const choice = PAYMENT_CHOICES.find((c) => c.value === paymentChoice);
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
      // navigate 진행 중 — 페이지 unload까지 대기 (단건과 동일).
      await new Promise(() => {});
    } catch (err: unknown) {
      if (createdOrderNo) {
        cancelPendingOrder(createdOrderNo, buyerEmail).catch((cancelErr) =>
          console.error('[cart-checkout] cancelPendingOrder failed:', cancelErr)
        );
      }
      // SDK v2 에러는 { code, message }. USER_CANCEL은 사용자가 결제창 닫은 경우라 에러 표시 생략.
      const errorObj = err as { code?: string; message?: string };
      const eventName = errorObj?.code === 'USER_CANCEL' ? 'checkout_cancel' : 'checkout_error';
      trackEvent(eventName, {
        value: estimatedTotal,
        currency: 'KRW',
        payment_type: paymentChoice,
        error_code: errorObj?.code ?? 'unknown',
        error_message: errorObj?.message ? errorObj.message.slice(0, 120) : null,
      });
      if (errorObj?.code !== 'USER_CANCEL') {
        setError(errorObj?.message ?? t('errorPayment'));
      }
      setSubmitting(false);
    }
  }

  // 하이드레이션 mismatch 방지 — mount 전엔 빈 자리만 차지.
  if (!mounted) {
    return (
      <div className="bg-canvas-soft">
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-24 min-h-[40vh]" aria-hidden="true" />
      </div>
    );
  }

  // 빈 카트 — 결제 차단 + 카트로 안내.
  if (items.length === 0) {
    return (
      <div className="bg-canvas-soft">
        <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
          <div className="rounded-2xl border border-gallery-hairline bg-white p-10 text-center shadow-sm">
            <p className="text-lg font-semibold text-charcoal-deep">{tc('empty')}</p>
            <p className="mt-2 text-sm text-charcoal-muted">{tc('emptyHint')}</p>
            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button href="/cart" variant="primary">
                {tc('viewCart')}
              </Button>
              <Button href="/artworks" variant="outline">
                {tc('browseArtworks')}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-canvas-soft">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
        <Link
          href="/cart"
          className="mb-6 inline-flex items-center gap-1 text-sm text-charcoal-soft hover:text-charcoal"
        >
          <span aria-hidden="true">←</span>
          {tc('viewCart')}
        </Link>

        <h1 className="mb-6 text-2xl font-bold text-charcoal">{t('pageTitle')}</h1>

        {/* 주문 항목 요약 */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gallery-divider">
            {items.map((item) => {
              const info = detailById.get(item.artworkId);
              const soldOut =
                info?.isAvailable === false || highlightUnavailable.includes(item.artworkId);
              const imageSrc = info?.image ? resolveArtworkImageUrl(info.image) : '';
              return (
                <li
                  key={item.artworkId}
                  className={clsx('flex items-center gap-4 p-4', soldOut && 'bg-danger/5')}
                >
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-gallery-hairline bg-gray-100">
                    {imageSrc ? (
                      <SafeImage
                        src={imageSrc}
                        alt={info?.title ?? ''}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-canvas-strong" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {info?.artistName ? (
                      <p className="text-xs text-charcoal-soft">{info.artistName}</p>
                    ) : null}
                    <p className="mt-0.5 truncate font-semibold text-charcoal">
                      {info?.title ?? ' '}
                    </p>
                    <p className="mt-0.5 text-xs text-charcoal-soft">
                      {tc('quantity')}: {item.quantity}
                    </p>
                    {soldOut ? (
                      <span className="mt-1 inline-flex items-center rounded bg-danger/10 px-1.5 py-0.5 text-xs font-semibold text-danger">
                        {tc('soldOut')}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-charcoal tabular-nums">
                      {info ? formatPriceForDisplay(info.price * item.quantity) : ' '}
                    </span>
                    {soldOut ? (
                      <button
                        type="button"
                        onClick={() => remove(item.artworkId)}
                        className="text-xs font-medium text-danger-a11y underline hover:text-danger"
                      >
                        {tc('remove')}
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>

          {hasSoldOut ? (
            <p className="border-t border-danger/10 bg-danger/5 px-4 py-3 text-xs text-danger">
              {tc('soldOutNotice')}
            </p>
          ) : null}
        </div>

        {/* 구매자 / 배송 정보 (단건과 동일 폼 재사용) */}
        <div className="mb-6">
          <BuyerInfoForm ref={buyerInfoRef} />
        </div>

        {/* 금액 요약 — 배송비는 표시용 추정. 권위값은 createOrder의 totalAmount. */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-base font-semibold text-charcoal">{t('paymentAmount')}</h3>
          <table className="w-full text-sm">
            <tbody className="divide-y divide-gray-100">
              <tr>
                <td className="py-2 text-gray-600">{t('artworkAmountLabel')}</td>
                <td className="py-2 text-right font-medium text-charcoal">
                  {loading && details.length === 0 ? '…' : formatPriceForDisplay(subtotal)}
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
                  {loading && details.length === 0 ? '…' : formatPriceForDisplay(estimatedTotal)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 결제수단 — 단건 CheckoutClient와 동일 UI. */}
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
              const description = value === 'TRANSFER' ? t('transferDescription') : null;
              return (
                <button
                  key={value}
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

        {/* Error */}
        {error && (
          <div
            role="alert"
            className="mb-4 rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger-a11y"
          >
            {error}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-gray-100 p-4 mb-6">
          <TrustBadges variant="checkout" />
        </div>

        <Button
          onClick={handlePayment}
          loading={submitting}
          disabled={hasSoldOut}
          size="lg"
          className="w-full"
        >
          {submitting ? t('processingShort') : t('payNow')}
        </Button>

        <CheckoutTrustNotice />
      </div>
    </div>
  );
}
