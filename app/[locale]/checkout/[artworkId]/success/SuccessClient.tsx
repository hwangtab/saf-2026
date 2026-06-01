'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
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

interface VirtualAccount {
  bankName: string;
  accountNumber: string;
  dueDate: string;
}

interface Landing {
  orderId: string;
  amount: string;
  currency: 'KRW' | 'USD';
}

type PageState = 'loading' | 'success' | 'virtual' | 'bank_transfer' | 'error';

function formatAmount(amount: number, currency: 'KRW' | 'USD'): string {
  return currency === 'USD' ? formatUsd(amount) : formatPriceForDisplay(amount);
}

function formatDeadline(locale: string): string {
  const deadline = new Date(Date.now() + 24 * 60 * 60 * 1000);
  if (locale === 'ko') {
    const m = deadline.getMonth() + 1;
    const d = deadline.getDate();
    const hh = String(deadline.getHours()).padStart(2, '0');
    const mm = String(deadline.getMinutes()).padStart(2, '0');
    return `${m}월 ${d}일 ${hh}:${mm}`;
  }
  return deadline.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * 결제 완료 페이지.
 *
 * 결제 식별자(paymentKey/orderId/amount/method/currency)는 **브라우저 URL의
 * `window.location.search`에서 직접 읽는다**. Next.js 16의 미들웨어 rewrite가
 * default-locale(`/checkout/...`) 경로의 server `searchParams`를 떨구는 회귀가 있어
 * (path params는 보존되지만 query는 유실됨), server component에서는 결제 파라미터를
 * 안정적으로 받을 수 없기 때문. 브라우저 주소창의 query는 internal rewrite와 무관하게
 * 원본을 유지하므로 client에서 읽으면 정확하다.
 */
export default function SuccessClient() {
  const t = useTranslations('checkout');
  const tOrder = useTranslations('orderLookup');
  const locale = useLocale();
  const router = useRouter();
  const params = useParams();
  const artworkId = String(params.artworkId ?? '');

  const deadline = useMemo(() => formatDeadline(locale), [locale]);
  const [state, setPageState] = useState<PageState>('loading');
  const [landing, setLanding] = useState<Landing | null>(null);
  const [virtualAccount, setVirtualAccount] = useState<VirtualAccount | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const confirmedRef = useRef(false);

  useEffect(() => {
    if (confirmedRef.current) return;
    confirmedRef.current = true;

    async function runConfirm(
      paymentKey: string,
      orderId: string,
      amount: string,
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
          }),
        });

        const data = (await res.json()) as {
          success?: boolean;
          alreadyPaid?: boolean;
          status?: string;
          virtualAccount?: VirtualAccount | null;
          error?: string;
        };

        if (!res.ok || !data.success) {
          setErrorMessage(data.error ?? t('confirmationError'));
          setPageState('error');
          return;
        }

        if (data.alreadyPaid || data.status === 'DONE') {
          // sessionGet/sessionSet: Safari 시크릿 모드 QuotaExceededError → 에러 화면 회귀 방지.
          // GA는 transaction_id로 자체 dedup하므로 silent fail이 안전.
          const purchaseKey = `purchase_fired_${orderId}`;
          if (!sessionGet<boolean>(purchaseKey)) {
            sessionSet(purchaseKey, true);
            trackEvent('purchase', {
              transaction_id: orderId,
              value: Number(amount),
              currency,
            });
          }
          // localStorage 멱등 가드 — 다른 탭·시크릿 reopen 시 sessionStorage 우회로 중복 카운트 방지.
          // storageGet/storageSet 사용: Safari 시크릿 모드에서 raw localStorage.setItem이
          // QuotaExceededError를 던져 결제 성공자에게 에러 화면을 노출하는 회귀 방지.
          const countKey = `saf:purchaseCounted:${orderId}`;
          if (!storageGet<boolean>(countKey)) {
            storageSet(countKey, true);
            incrementPurchaseCount();
          }
          setPageState('success');
        } else if (data.status === 'WAITING_FOR_DEPOSIT') {
          // 가상계좌 발급 이벤트 — 실제 결제 완료(purchase)는 입금 확인 웹훅에서 처리
          const vaKey = `va_issued_${orderId}`;
          if (!sessionGet<boolean>(vaKey)) {
            sessionSet(vaKey, true);
            trackEvent('virtual_account_issued', {
              transaction_id: orderId,
              value: Number(amount),
              currency,
            });
          }
          setVirtualAccount(data.virtualAccount ?? null);
          setPageState('virtual');
        } else {
          // IN_PROGRESS·PARTIAL_CANCELED 등 미확정 상태 — purchase 미발사
          // (실제 완료는 Toss 웹훅이 DONE 상태로 처리)
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
    const currencyParam = sp.get('currency');
    // currency 쿼리 우선 — 영문 페이지에서 결제수단별로 다름 (PayPal=USD, 그 외=KRW).
    // 쿼리 없을 때만 locale 기반 fallback. 무통장은 항상 KRW.
    const currency: 'KRW' | 'USD' =
      method === 'BANK_TRANSFER'
        ? 'KRW'
        : currencyParam === 'USD'
          ? 'USD'
          : currencyParam === 'KRW'
            ? 'KRW'
            : locale === 'en'
              ? 'USD'
              : 'KRW';

    // 결제 식별자 누락 — 직접 진입/위조. 404 대신 작품 상세로 안내.
    if (!orderId || !amount) {
      router.replace(`/artworks/${artworkId}`);
      return;
    }
    // SSR엔 window가 없어 client mount 후에만 URL 파싱 가능 — effect 초기화가 정당.

    setLanding({ orderId, amount, currency });

    // 무통장 계좌이체: Toss confirm 호출 없이 안내 페이지 노출.
    // 단 임의 orderId로 SAF 브랜드 계좌 안내 화면을 위조하는 피싱 방지를 위해
    // 실제 awaiting_deposit/paid 주문인지 server에서 검증.
    if (method === 'BANK_TRANSFER') {
      void (async () => {
        const valid = await verifyBankTransferLanding(orderId).catch(() => false);
        if (!valid) {
          router.replace(`/artworks/${artworkId}`);
          return;
        }
        // add_payment_info는 확정된 주문에만 발화. orderId 가드로 새로고침 중복 방지.
        const bankTransferKey = `add_payment_info_fired_${orderId}`;
        if (!sessionGet<boolean>(bankTransferKey)) {
          sessionSet(bankTransferKey, true);
          trackEvent('add_payment_info', {
            value: Number(amount),
            currency,
            payment_type: 'TRANSFER',
          });
        }
        setPageState('bank_transfer');
      })();
      return;
    }

    // 카드/간편결제인데 paymentKey 없음 — 비정상 진입. 작품 상세로.
    if (!paymentKey) {
      router.replace(`/artworks/${artworkId}`);
      return;
    }

    void runConfirm(paymentKey, orderId, amount, currency);
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
            <p className="text-sm text-gray-600 mb-6">{errorMessage}</p>
            <LinkButton href="/artworks" variant="primary" size="sm">
              {t('backToArtworks')}
            </LinkButton>
          </div>
        </div>
      </div>
    );
  }

  // 무통장 계좌이체 — 우리 계좌번호 안내 (NH 농협 / 한국스마트협동조합)
  if (state === 'bank_transfer') {
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
                <span className="font-semibold text-charcoal">{t('bankTransferBank')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('depositAccountNumber')}</span>
                <span className="font-semibold text-charcoal font-mono">
                  {t('bankTransferAccount')}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-soft">{t('bankTransferHolder')}</span>
                <span className="font-semibold text-charcoal">{t('bankTransferHolderName')}</span>
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
              <p>{t('bankTransferNoticeDeadline', { deadline })}</p>
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

          {/* 매뉴얼 8.6 자긍심 박스 — 회복 서사 톤. 죄책감·평가 톤 회피하고 컬렉터를 "동료"로 초대. */}
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
