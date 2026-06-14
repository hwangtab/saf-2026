'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import {
  registerEvent,
  type RegisterEventInput,
  type RegisterEventResult,
} from '@/app/actions/event-registration';

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100';
const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';
const ERROR_TEXT = 'mt-1.5 text-sm text-danger';

interface Props {
  isOpen: boolean;
  remaining: number;
  feePerPerson: number;
  clientKey: string | null;
}

export default function RegistrationForm({ isOpen, remaining, feePerPerson, clientKey }: Props) {
  const t = useTranslations('event.ohYoonMemorial');
  const [applicantName, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [partySize, setPartySize] = useState(1);
  const [boardingConfirmed, setBoarding] = useState(false);
  const [agreedPrivacy, setAgreed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<RegisterEventResult | null>(null);

  const amount = partySize * feePerPerson;
  const canSeat = isOpen && remaining >= partySize;

  async function startTossPayment(payment: { orderNo: string; amount: number; orderName: string }) {
    if (!clientKey) {
      setResult({ ok: false, code: 'INTERNAL_ERROR', message: t('errorGeneric') });
      return;
    }
    const successUrl = `${window.location.origin}/event/oh-yoon-memorial/success`;
    const failUrl = `${window.location.origin}/event/oh-yoon-memorial/fail`;
    const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
    const tossPayments = await loadTossPayments(clientKey);
    const tossPayment = tossPayments.payment({ customerKey: payment.orderNo });
    await tossPayment.requestPayment({
      method: 'CARD',
      amount: { currency: 'KRW', value: payment.amount },
      orderId: payment.orderNo,
      orderName: payment.orderName,
      customerName: applicantName,
      ...(email ? { customerEmail: email } : {}),
      successUrl,
      failUrl,
    });
    // redirect 진행 중 — 페이지 unload까지 대기
    await new Promise(() => {});
  }

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
      });
      setResult(res);
      if (res.ok && res.code === 'OK_PENDING' && res.payment) {
        await startTossPayment(res.payment);
      }
    });
  }

  if (result?.ok && result.code === 'OK_WAITLIST') {
    return (
      <div
        className="mt-6 rounded-xl border border-primary/30 bg-white px-6 py-10 text-center"
        role="status"
      >
        <h3 className="font-display text-2xl font-bold text-charcoal-deep">{t('waitlistTitle')}</h3>
        <p className="mt-3 text-charcoal">{t('waitlistBody')}</p>
      </div>
    );
  }

  const err = (k: keyof RegisterEventInput) =>
    result && !result.ok ? result.errors?.[k] : undefined;

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
        <input
          id="ev-party"
          type="number"
          min={1}
          max={20}
          value={partySize}
          onChange={(e) => setPartySize(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
          required
          className={INPUT_BASE}
        />
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

      <p className="text-right text-sm font-semibold text-charcoal-deep">
        {t('formFeeSummary', { amount: amount.toLocaleString('ko-KR') })}
      </p>

      {result && !result.ok && result.message && (
        <p
          role="alert"
          className="rounded-lg border-2 border-danger/40 bg-white px-4 py-3 text-sm text-danger-a11y"
        >
          {result.message}
        </p>
      )}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? t('submitting') : canSeat ? t('submitPay') : t('submitWaitlist')}
      </Button>
    </form>
  );
}
