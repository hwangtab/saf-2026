'use client';

import { useEffect, useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { registerEvent } from '@/app/actions/event-registration';
import { resumeEventPayment, cancelEventPendingPayment } from '@/app/actions/event-admin';

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100';
const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';
const ERROR_TEXT = 'mt-1.5 text-sm text-danger';
type RegisterEventField =
  | 'applicantName'
  | 'phone'
  | 'email'
  | 'partySize'
  | 'boardingConfirmed'
  | 'agreedPrivacy';
type RegisterEventResultState = Awaited<ReturnType<typeof registerEvent>>;

interface Props {
  isOpen: boolean;
  remaining: number;
  feePerPerson: number;
  clientKey: string | null;
}

export default function RegistrationForm({ isOpen, remaining, feePerPerson, clientKey }: Props) {
  const t = useTranslations('event.ohYoonMemorial');
  const locale = useLocale();
  const [applicantName, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  // 인원은 편집 중 빈 문자열을 허용해야 '1'을 지우고 다시 입력할 수 있다(13 입력 버그 방지).
  // 표시는 문자열, 계산/제출은 clamp한 숫자(partySize)를 사용.
  const [partyStr, setPartyStr] = useState('1');
  const [boardingConfirmed, setBoarding] = useState(false);
  const [agreedPrivacy, setAgreed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'transfer'>('card');
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegisterEventResultState | null>(null);
  const [resumePayment, setResumePayment] = useState<{
    orderNo: string;
    amount: number;
    orderName: string;
    customerName?: string;
    customerEmail?: string;
  } | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const clampParty = (n: number) => Math.max(1, Math.min(20, n));
  const partySize = clampParty(parseInt(partyStr || '1', 10) || 1);
  const setParty = (n: number) => setPartyStr(String(clampParty(n)));

  const amount = partySize * feePerPerson;
  const canSeat = isOpen && remaining >= partySize;

  async function startTossPayment(payment: {
    orderNo: string;
    amount: number;
    orderName: string;
    customerName?: string;
    customerEmail?: string;
  }) {
    if (!clientKey) {
      setResult({ ok: false, code: 'INTERNAL_ERROR', message: t('errorGeneric') });
      return;
    }
    const localePrefix = locale === 'en' ? '/en' : '';
    const successUrl = `${window.location.origin}${localePrefix}/event/oh-yoon-memorial/success`;
    const failUrl = `${window.location.origin}${localePrefix}/event/oh-yoon-memorial/fail`;
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const tossPayments = await loadTossPayments(clientKey);
    const tossPayment = tossPayments.payment({ customerKey: payment.orderNo });
    try {
      await tossPayment.requestPayment({
        method: 'CARD',
        amount: { currency: 'KRW', value: payment.amount },
        orderId: payment.orderNo,
        orderName: payment.orderName,
        customerName: payment.customerName ?? applicantName,
        ...((payment.customerEmail ?? email)
          ? { customerEmail: payment.customerEmail ?? email }
          : {}),
        successUrl,
        failUrl,
      });
      // redirect 진행 중 — 페이지 unload까지 대기
      await new Promise(() => {});
    } catch (err) {
      // Toss SDK v2 에러는 { code, message }. 사용자가 결제창을 닫으면 USER_CANCEL —
      // 에러 화면 대신 폼을 그대로 유지하고, 잡아둔 좌석(pending hold)은 즉시 반환한다.
      // (try/catch 없으면 rejection이 error 경계로 전파돼 흰 에러 화면 + hero 헤더 가림 발생.)
      const e = err as { code?: string; message?: string };
      void cancelEventPendingPayment(payment.orderNo, e?.code ?? 'USER_CANCEL');
      if (e?.code === 'USER_CANCEL') return;
      setResult({ ok: false, code: 'INTERNAL_ERROR', message: t('errorGeneric') });
    }
  }

  useEffect(() => {
    const orderNo = new URLSearchParams(window.location.search).get('eventOrderNo');
    if (!orderNo) return;
    let cancelled = false;
    startTransition(async () => {
      const res = await resumeEventPayment(orderNo);
      if (cancelled) return;
      if (res.ok) {
        setResumePayment(res.payment);
        setResumeError(null);
      } else {
        setResumePayment(null);
        setResumeError(res.message);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [startTransition]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    startTransition(async () => {
      const res = await registerEvent({
        applicantName,
        phone,
        email,
        partySize,
        boardingConfirmed,
        agreedPrivacy,
        paymentMethod,
      });
      setResult(res);
      if (res.ok && res.code === 'OK_PENDING' && 'payment' in res && res.payment) {
        await startTossPayment(res.payment);
      }
    });
  }

  if (result?.ok && result.code === 'OK_WAITLIST') {
    return (
      <div
        className="mt-6 rounded-xl border border-primary/30 bg-white px-6 py-10 text-center"
        aria-live="polite"
      >
        <h3 className="font-display text-2xl font-bold text-charcoal-deep">{t('waitlistTitle')}</h3>
        <p className="mt-3 text-charcoal">{t('waitlistBody')}</p>
      </div>
    );
  }

  if (result?.ok && result.code === 'OK_DEPOSIT' && 'deposit' in result && result.deposit) {
    const d = result.deposit;
    return (
      <div
        className="mt-6 rounded-xl border border-primary/30 bg-white px-6 py-8"
        aria-live="polite"
      >
        <h3 className="text-center font-display text-2xl font-bold text-charcoal-deep">
          {t('depositTitle')}
        </h3>
        <p className="mt-3 text-center text-charcoal break-keep">{t('depositLead')}</p>
        <dl className="mt-6 space-y-2 rounded-lg bg-canvas p-5 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-charcoal-muted">{t('depositBankLabel')}</dt>
            <dd className="font-semibold text-charcoal-deep">{d.bank}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-charcoal-muted">{t('depositAccountLabel')}</dt>
            <dd className="font-bold text-charcoal-deep">{d.account}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-charcoal-muted">{t('depositHolderLabel')}</dt>
            <dd className="font-semibold text-charcoal-deep">{d.holder}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-gray-200 pt-2">
            <dt className="text-charcoal-muted">{t('depositAmountLabel')}</dt>
            <dd className="font-bold text-primary-strong">
              {t('formFeeSummary', { amount: d.amount.toLocaleString('ko-KR') })}
            </dd>
          </div>
        </dl>
        <p className="mt-4 text-center text-sm text-charcoal-muted break-keep">
          {t('depositNotice')}
        </p>
      </div>
    );
  }

  const err = (k: RegisterEventField) => (result && !result.ok ? result.errors?.[k] : undefined);

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
    >
      <div>
        <label htmlFor="ev-name" className={LABEL_BASE}>
          {t('formNameLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="ev-name"
          type="text"
          value={applicantName}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          required
          className={INPUT_BASE}
        />
        {err('applicantName') && <p className={ERROR_TEXT}>{err('applicantName')}</p>}
      </div>

      <div>
        <label htmlFor="ev-phone" className={LABEL_BASE}>
          {t('formPhoneLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="ev-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          required
          placeholder="010-1234-5678"
          className={INPUT_BASE}
        />
        {err('phone') && <p className={ERROR_TEXT}>{err('phone')}</p>}
      </div>

      <div>
        <label htmlFor="ev-email" className={LABEL_BASE}>
          {t('formEmailLabel')}
        </label>
        <input
          id="ev-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          className={INPUT_BASE}
        />
        <p className="mt-1.5 text-xs text-charcoal-muted">{t('formEmailHelp')}</p>
        {err('email') && <p className={ERROR_TEXT}>{err('email')}</p>}
      </div>

      <div>
        <label htmlFor="ev-party" className={LABEL_BASE}>
          {t('formPartySizeLabel')} <span className="text-danger">*</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setParty(partySize - 1)}
            disabled={partySize <= 1}
            aria-label="인원 줄이기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl font-bold text-charcoal-deep transition hover:bg-canvas disabled:opacity-40"
          >
            −
          </button>
          <input
            id="ev-party"
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={partyStr}
            onChange={(e) => setPartyStr(e.target.value.replace(/[^0-9]/g, '').slice(0, 2))}
            onBlur={() => setParty(parseInt(partyStr || '1', 10) || 1)}
            required
            className={`${INPUT_BASE} w-20 text-center`}
          />
          <button
            type="button"
            onClick={() => setParty(partySize + 1)}
            disabled={partySize >= 20}
            aria-label="인원 늘리기"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-gray-300 bg-white text-xl font-bold text-charcoal-deep transition hover:bg-canvas disabled:opacity-40"
          >
            +
          </button>
          <span className="ml-1 text-sm text-charcoal-muted">명</span>
        </div>
        {err('partySize') && <p className={ERROR_TEXT}>{err('partySize')}</p>}
      </div>

      <div className="flex items-start gap-3 rounded-lg bg-canvas p-4">
        <input
          id="ev-boarding"
          type="checkbox"
          checked={boardingConfirmed}
          onChange={(e) => setBoarding(e.target.checked)}
          className="mt-1 h-4 w-4 rounded"
        />
        <label htmlFor="ev-boarding" className="break-keep text-sm text-charcoal">
          {t('formBoardingLabel')}
        </label>
      </div>

      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <label className="flex cursor-pointer items-start gap-3 break-keep text-sm text-charcoal">
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded"
            required
          />
          <span>{t('formPrivacyLabel')}</span>
        </label>
        {err('agreedPrivacy') && <p className={ERROR_TEXT}>{err('agreedPrivacy')}</p>}
      </fieldset>

      {canSeat && (
        <fieldset className="space-y-2">
          <legend className={LABEL_BASE}>{t('paymentMethodLabel')}</legend>
          <div className="grid grid-cols-2 gap-2">
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition ${
                paymentMethod === 'card'
                  ? 'border-primary bg-primary-surface text-primary-strong'
                  : 'border-gray-300 bg-white text-charcoal'
              }`}
            >
              <input
                type="radio"
                name="ev-payment"
                value="card"
                checked={paymentMethod === 'card'}
                onChange={() => setPaymentMethod('card')}
                className="sr-only"
              />
              {t('paymentMethodCard')}
            </label>
            <label
              className={`flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 px-3 py-2.5 text-sm font-semibold transition ${
                paymentMethod === 'transfer'
                  ? 'border-primary bg-primary-surface text-primary-strong'
                  : 'border-gray-300 bg-white text-charcoal'
              }`}
            >
              <input
                type="radio"
                name="ev-payment"
                value="transfer"
                checked={paymentMethod === 'transfer'}
                onChange={() => setPaymentMethod('transfer')}
                className="sr-only"
              />
              {t('paymentMethodTransfer')}
            </label>
          </div>
          {paymentMethod === 'transfer' && (
            <p className="text-xs text-charcoal-muted break-keep">{t('paymentTransferHelp')}</p>
          )}
        </fieldset>
      )}

      <p className="text-right text-sm font-semibold text-charcoal-deep">
        {t('formFeeSummary', { amount: amount.toLocaleString('ko-KR') })}
      </p>

      {(resumePayment || resumeError) && (
        <div className="rounded-lg border border-primary/30 bg-canvas px-4 py-3 text-sm text-charcoal">
          {resumePayment ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>
                대기자 결제 안내 링크가 확인되었습니다. 회비{' '}
                {resumePayment.amount.toLocaleString('ko-KR')}원을 결제해 주세요.
              </span>
              <Button
                type="button"
                variant="primary"
                size="sm"
                disabled={pending}
                onClick={() => startTossPayment(resumePayment)}
              >
                결제 진행
              </Button>
            </div>
          ) : (
            <p role="alert">{resumeError}</p>
          )}
        </div>
      )}

      {result && !result.ok && result.message && (
        <p
          role="alert"
          className="rounded-lg border-2 border-danger/40 bg-white px-4 py-3 text-sm text-danger-a11y"
        >
          {result.message}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending
          ? t('submitting')
          : !canSeat
            ? t('submitWaitlist')
            : paymentMethod === 'transfer'
              ? t('submitTransfer')
              : t('submitPay')}
      </Button>
    </form>
  );
}
