'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import LinkButton from '@/components/ui/LinkButton';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import { formatPriceForDisplay } from '@/lib/utils';
import { formatUsd } from '@/lib/utils/currency';
import { LOAN_COUNT } from '@/lib/site-stats';
import { trackEvent } from '@/lib/analytics/track';
import { incrementPurchaseCount } from '@/lib/purchase-state';
import { storageGet, storageSet, sessionGet, sessionSet } from '@/lib/storage';
import { verifyBankTransferLanding } from '@/app/actions/checkout';
import { useCart } from '@/components/providers/CartProvider';

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  dueDate: string;
}

interface BankTransferDisplay {
  bankName: string;
  accountNumber: string;
  holderName: string;
  dueDate: string;
}

interface Landing {
  orderId: string;
  amount: string;
  currency: 'KRW' | 'USD';
}

interface PendingCheckoutSession {
  orderId: string;
  checkoutToken: string;
  currency?: 'KRW' | 'USD';
}

interface PurchaseAnalyticsItem {
  item_id: string;
  item_name?: string;
  price: number;
  quantity: number;
}

interface PurchaseAnalytics {
  value: number;
  shipping: number;
  items: PurchaseAnalyticsItem[];
}

type PageState = 'loading' | 'success' | 'virtual' | 'bank_transfer' | 'error';

function formatAmount(amount: number, currency: 'KRW' | 'USD'): string {
  return currency === 'USD' ? formatUsd(amount) : formatPriceForDisplay(amount);
}

/**
 * 카트(다품목) 결제 완료 페이지.
 *
 * 단건 [artworkId]/success/SuccessClient의 로직을 거의 그대로 복제한다. 차이점:
 *  - artworkId path param이 없으므로 checkoutToken은 orderId 키 세션 캐시로만 복원
 *  - 비정상 진입(파라미터 누락)은 작품 상세 대신 `/artworks` 목록으로 안내
 *  - 결제 확정(success/virtual/bank_transfer) 시 **카트를 비운다** (단건엔 없던 단계)
 *
 * 결제 식별자는 server `searchParams`가 아니라 **브라우저 URL의 window.location.search**에서
 * 직접 읽는다 (Next.js 16 미들웨어 rewrite query 유실 회귀 방지).
 */
export default function SuccessClient() {
  const t = useTranslations('checkout');
  const tOrder = useTranslations('orderLookup');
  const locale = useLocale();
  const router = useRouter();
  const { clear } = useCart();

  const [state, setPageState] = useState<PageState>('loading');
  const [landing, setLanding] = useState<Landing | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [bankTransfer, setBankTransfer] = useState<BankTransferDisplay | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmedRef = useRef(false);
  const cartClearedRef = useRef(false);

  // 결제 확정 시 카트 비우기 (멱등 — effect 재실행/리렌더 대비).
  const clearCartOnce = useMemo(() => {
    return () => {
      if (cartClearedRef.current) return;
      cartClearedRef.current = true;
      clear();
    };
  }, [clear]);

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    async function runConfirm(
      paymentKey: string,
      orderId: string,
      amount: string,
      checkoutToken: string,
      currency: 'KRW' | 'USD'
    ) {
      try {
        const res = await fetch('/api/payments/toss/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paymentKey,
            orderId,
            amount: Number(amount),
            checkoutToken,
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          alreadyPaid?: boolean;
          status?: string;
          virtualAccount?: VirtualAccount | null;
          analyticsPurchase?: PurchaseAnalytics | null;
          error?: string;
        };

        if (!res.ok || !data.success) {
          setErrorMessage(data.error ?? t('confirmationError'));
          setPageState('error');
          return;
        }

        if (data.alreadyPaid || data.status === 'DONE') {
          // sessionGet/sessionSet: Safari 시크릿 QuotaExceededError → 에러 화면 회귀 방지.
          const purchaseKey = `purchase_fired_${orderId}`;
          if (!sessionGet<boolean>(purchaseKey)) {
            sessionSet(purchaseKey, true);
            // 다품목 GA purchase: confirm이 order_items로 만든 items[]+shipping을 그대로 전달.
            // payload가 없으면(legacy/누락) value만 보내 단건 fallback과 동일하게 동작.
            const purchase = data.analyticsPurchase ?? null;
            const shippingAmount = purchase?.shipping ?? 0;
            trackEvent(
              'purchase',
              {
                transaction_id: orderId,
                value: Number(amount),
                currency,
                shipping_amount: shippingAmount,
                item_count: purchase?.items.length ?? 0,
              },
              purchase
                ? {
                    ga4Params: {
                      transaction_id: orderId,
                      value: Number(amount),
                      currency,
                      shipping: shippingAmount,
                      items: purchase.items.map((item) => ({
                        item_id: item.item_id,
                        item_name: item.item_name ?? item.item_id,
                        item_category: 'artwork',
                        price: item.price,
                        quantity: item.quantity,
                      })),
                    },
                  }
                : {}
            );
          }
          // localStorage 멱등 가드 — 다른 탭·시크릿 reopen 시 중복 카운트 방지.
          const countKey = `saf:purchaseCounted:${orderId}`;
          if (!storageGet<boolean>(countKey)) {
            storageSet(countKey, true);
            incrementPurchaseCount();
          }
          clearCartOnce();
          setPageState('success');
        } else if (data.status === 'WAITING_FOR_DEPOSIT') {
          const vaKey = `va_issued_${orderId}`;
          if (!sessionGet<boolean>(vaKey)) {
            sessionSet(vaKey, true);
            trackEvent('virtual_account_issued', {
              transaction_id: orderId,
              value: Number(amount),
              currency,
            });
          }
          // 가상계좌 발급도 주문 확정 — 카트 비우기 (입금 대기 상태).
          clearCartOnce();
          setVirtualAccount(data.virtualAccount ?? null);
          setPageState('virtual');
        } else {
          // IN_PROGRESS·PARTIAL_CANCELED 등 — purchase 미발사. 주문은 생성됐으므로 카트 비움.
          clearCartOnce();
          setPageState('success');
        }
      } catch {
        setErrorMessage(t('networkError'));
        setPageState('error');
      }
    }

    const sp = new URLSearchParams(window.location.search);
    const paymentKey = sp.get('paymentKey') ?? '';
    const orderId = sp.get('orderId') ?? '';
    const amount = sp.get('amount') ?? '';
    const method = sp.get('method') ?? '';
    const storedCheckout = orderId
      ? sessionGet<PendingCheckoutSession>(`saf:checkout:${orderId}`)
      : null;
    const checkoutToken = sp.get('checkoutToken') ?? storedCheckout?.checkoutToken ?? '';
    const currencyParam = sp.get('currency');
    const currency: 'KRW' | 'USD' =
      method === 'BANK_TRANSFER'
        ? 'KRW'
        : currencyParam === 'USD'
          ? 'USD'
          : currencyParam === 'KRW'
            ? 'KRW'
            : storedCheckout?.currency === 'USD'
              ? 'USD'
              : storedCheckout?.currency === 'KRW'
                ? 'KRW'
                : locale === 'en'
                  ? 'USD'
                  : 'KRW';

    // 결제 식별자 누락 — 직접 진입/위조. 작품 목록으로 안내.
    if (!orderId || !amount) {
      router.replace('/artworks');
      return;
    }

    setLanding({ orderId, amount, currency });

    // 무통장 계좌이체: Toss confirm 없이 안내 페이지. 피싱 방지 위해 서버 검증.
    if (method === 'BANK_TRANSFER') {
      void (async () => {
        const verification = await verifyBankTransferLanding(orderId, checkoutToken).catch(() => ({
          ok: false as const,
        }));
        if (!verification.ok) {
          router.replace('/artworks');
          return;
        }
        const bankTransferKey = `add_payment_info_fired_${orderId}`;
        if (!sessionGet<boolean>(bankTransferKey)) {
          sessionSet(bankTransferKey, true);
          trackEvent('add_payment_info', {
            value: Number(amount),
            currency,
            payment_type: 'TRANSFER',
          });
        }
        clearCartOnce();
        setBankTransfer(verification.bankTransfer);
        setPageState('bank_transfer');
      })();
      return;
    }

    // 카드/간편결제인데 paymentKey 없음 — 비정상 진입.
    if (!paymentKey) {
      router.replace('/artworks');
      return;
    }

    void runConfirm(paymentKey, orderId, amount, checkoutToken, currency);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orderId = landing?.orderId ?? '';
  const amount = landing?.amount ?? '';
  const currency: 'KRW' | 'USD' = landing?.currency ?? 'KRW';

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-24">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
        <p className="text-sm text-charcoal-soft">{t('confirmingPayment')}</p>
      </div>
    );
  }

  if (state === 'error') {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4 text-center">
          <div className="rounded-2xl border border-danger/20 bg-white p-10 shadow-sm">
            <p className="text-4xl mb-4">!</p>
            <h1 className="text-xl font-bold text-charcoal mb-2">{t('confirmationFailed')}</h1>
            <p className="text-sm text-gray-600 mb-3">{errorMessage}</p>
            <p className="text-xs text-charcoal-soft mb-6 break-keep">
              {t('confirmErrorReassure')}
            </p>
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <LinkButton
                href={orderId ? `/orders?orderNo=${encodeURIComponent(orderId)}` : '/orders'}
                variant="primary"
                size="sm"
              >
                {tOrder('viewOrders')}
              </LinkButton>
              <LinkButton href="/artworks" variant="outline" size="sm">
                {t('backToArtworks')}
              </LinkButton>
            </div>
            <p className="mt-6 text-xs text-charcoal-soft">
              {t('supportContact', { phone: '02-764-3114', email: 'contact@kosmart.org' })}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'bank_transfer') {
    if (!bankTransfer) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 pt-24">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-gray-200 border-t-primary" />
          <p className="text-sm text-charcoal-soft">{t('confirmingPayment')}</p>
        </div>
      );
    }

    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🏦</p>
            <h1 className="text-2xl font-bold text-charcoal mb-2">{t('bankTransferTitle')}</h1>
            <p className="text-sm text-charcoal-soft mb-8">{t('bankTransferGuide')}</p>

            <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositBankName')}</span>
                <span className="font-semibold text-charcoal">{bankTransfer.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositAccountNumber')}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {bankTransfer.accountNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('bankTransferHolder')}</span>
                <span className="font-semibold text-charcoal">{bankTransfer.holderName}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-gray-200 pt-3">
                <span className="text-charcoal-soft">{t('orderNo')}</span>
                <span className="font-mono font-semibold text-charcoal">{orderId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositAmount')}</span>
                <span className="font-bold text-primary-a11y">
                  {formatAmount(Number(amount), currency)}
                </span>
              </div>
            </div>

            <div className="text-xs text-charcoal-soft mb-6 space-y-1">
              <p>{t('bankTransferNoticeName')}</p>
              <p>{t('bankTransferNoticeDeadline', { deadline: bankTransfer.dueDate })}</p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
                {t('browseMore')}
              </LinkButton>
              <LinkButton href="/orders" variant="white" size="sm" className="px-6 py-3">
                {tOrder('viewOrders')}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'virtual' && virtualAccount) {
    return (
      <div
        className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
      >
        <div className="max-w-lg w-full mx-auto px-4">
          <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
            <p className="text-4xl mb-4">🏦</p>
            <h1 className="text-2xl font-bold text-charcoal mb-2">{t('waitingDeposit')}</h1>
            <p className="text-sm text-charcoal-soft mb-8">{t('depositInstructions')}</p>

            <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-8">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositBankName')}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.bankName}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositAccountNumber')}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {virtualAccount.accountNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositDeadline')}</span>
                <span className="font-semibold text-charcoal">{virtualAccount.dueDate}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositAmount')}</span>
                <span className="font-bold text-primary-a11y">
                  {formatAmount(Number(amount), currency)}
                </span>
              </div>
            </div>

            <p className="text-xs text-charcoal-soft mb-6">{t('depositEmailNotice')}</p>

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
              <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
                {t('browseMore')}
              </LinkButton>
              <LinkButton href="/orders" variant="white" size="sm" className="px-6 py-3">
                {tOrder('viewOrders')}
              </LinkButton>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success — 매뉴얼 8.6 결제 완료 자긍심 메시지
  const loanCountFormatted = LOAN_COUNT.toLocaleString(locale === 'en' ? 'en-US' : 'ko-KR');
  return (
    <div
      className={`min-h-screen bg-canvas-soft flex items-center justify-center pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="max-w-lg w-full mx-auto px-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-10 shadow-sm text-center">
          <p className="text-5xl mb-4">✓</p>
          <h1 className="text-2xl font-bold text-charcoal mb-2 break-keep text-balance">
            {t('paymentSuccess')}
          </h1>
          <p className="text-sm text-charcoal-soft mb-8 break-keep text-balance">
            {t('successThankYou')}
          </p>

          <div className="rounded-xl bg-gray-50 p-6 text-left space-y-3 mb-6">
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-soft">{t('orderNo')}</span>
              <span className="font-mono font-semibold text-charcoal">{orderId}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-charcoal-soft">{t('paymentAmount')}</span>
              <span className="font-bold text-primary-a11y">
                {formatAmount(Number(amount), currency)}
              </span>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-canvas-soft p-5 mb-8 text-left">
            <p className="text-sm font-semibold text-charcoal-deep mb-1.5 break-keep text-balance">
              {t('successPrideHead')}
            </p>
            <p className="text-sm text-charcoal-muted leading-relaxed break-keep text-balance">
              {t('successPrideBody', { loanCount: loanCountFormatted })}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <LinkButton href="/artworks" variant="primary" size="sm" className="px-6 py-3">
              {t('browseMore')}
            </LinkButton>
            <LinkButton
              href={orderId ? `/orders?orderNo=${encodeURIComponent(orderId)}` : '/orders'}
              variant="white"
              size="sm"
              className="px-6 py-3"
            >
              {tOrder('viewOrders')}
            </LinkButton>
          </div>
        </div>
      </div>
    </div>
  );
}
