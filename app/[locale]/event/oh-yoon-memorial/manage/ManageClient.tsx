'use client';

import { useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import Button from '@/components/ui/Button';
import { HEADER_SAFE_TOP_PADDING } from '@/lib/header-safe-padding';
import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';
import {
  requestEventRefundCode,
  verifyEventRefundCode,
  selfRefundEventRegistration,
  type EventRegistrationView,
} from '@/app/actions/event-self-service';

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100';
const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';

const STATUS_KEY: Record<EventRegistrationView['status'], string> = {
  confirmed: 'manageStatusConfirmed',
  pending: 'manageStatusPending',
  waitlist: 'manageStatusWaitlist',
  cancelled: 'manageStatusCancelled',
  expired: 'manageStatusExpired',
  awaiting_deposit: 'manageStatusAwaitingDeposit',
};

type Step = 'phone' | 'code' | 'result';

export default function ManageClient() {
  const t = useTranslations('event.ohYoonMemorial');
  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [reg, setReg] = useState<EventRegistrationView | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [refunded, setRefunded] = useState(false);
  const [pending, startTransition] = useTransition();

  function sendCode(e?: React.FormEvent<HTMLFormElement>) {
    e?.preventDefault();
    if (pending) return;
    setNotice(null);
    startTransition(async () => {
      const res = await requestEventRefundCode(phone);
      if (res.ok) {
        setStep('code');
        setNotice(t('manageCodeSent'));
      } else {
        setNotice(res.message ?? t('manageError'));
      }
    });
  }

  function verify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;
    setNotice(null);
    startTransition(async () => {
      const res = await verifyEventRefundCode(phone, code);
      if (res.ok && res.registration) {
        setReg(res.registration);
        setStep('result');
      } else {
        setNotice(res.message ?? t('manageError'));
      }
    });
  }

  function refund() {
    if (pending || !reg) return;
    if (!window.confirm(t('manageRefundConfirm'))) return;
    startTransition(async () => {
      const res = await selfRefundEventRegistration(phone, code);
      if (res.ok) {
        setRefunded(true);
        setReg(res.registration ?? { ...reg, status: 'cancelled' });
        setNotice(t('manageRefunded'));
      } else {
        setNotice(res.message ?? t('manageError'));
      }
    });
  }

  // 무통장 미입금 본인 취소 (환불 없이 좌석 반납) — 동일 액션, 안내 문구만 다름.
  function cancelDeposit() {
    if (pending || !reg) return;
    if (!window.confirm(t('manageCancelConfirm'))) return;
    startTransition(async () => {
      const res = await selfRefundEventRegistration(phone, code);
      if (res.ok) {
        setRefunded(true);
        setReg(res.registration ?? { ...reg, status: 'cancelled' });
        setNotice(t('manageCancelled'));
      } else {
        setNotice(res.message ?? t('manageError'));
      }
    });
  }

  return (
    <main
      className={`flex min-h-[70vh] items-center justify-center bg-canvas px-4 pb-16 text-pretty md:pb-24 ${HEADER_SAFE_TOP_PADDING} ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="w-full max-w-md">
        <h1 className="text-center font-display text-3xl font-bold text-charcoal-deep">
          {t('manageTitle')}
        </h1>
        <p className="mt-2 text-center text-charcoal-muted break-keep">{t('manageLead')}</p>

        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          {/* 1단계: 휴대폰 → 인증번호 발송 */}
          {step === 'phone' && (
            <form onSubmit={sendCode} noValidate className="space-y-4">
              <div>
                <label htmlFor="m-phone" className={LABEL_BASE}>
                  {t('managePhoneLabel')}
                </label>
                <input
                  id="m-phone"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="010-1234-5678"
                  className={INPUT_BASE}
                />
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={pending}
                className="w-full"
              >
                {pending ? t('manageSending') : t('manageSendCode')}
              </Button>
            </form>
          )}

          {/* 2단계: 인증번호 입력 */}
          {step === 'code' && (
            <form onSubmit={verify} noValidate className="space-y-4">
              <div>
                <label htmlFor="m-code" className={LABEL_BASE}>
                  {t('manageCodeLabel')}
                </label>
                <input
                  id="m-code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
                  placeholder="000000"
                  className={`${INPUT_BASE} text-center text-lg tracking-[0.4em]`}
                />
                <p className="mt-1.5 text-xs text-charcoal-muted">{t('manageCodeHint')}</p>
              </div>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                disabled={pending}
                className="w-full"
              >
                {pending ? t('manageVerifying') : t('manageVerifyBtn')}
              </Button>
              <button
                type="button"
                onClick={() => sendCode()}
                disabled={pending}
                className="w-full text-sm text-charcoal-muted underline hover:text-primary"
              >
                {t('manageResend')}
              </button>
            </form>
          )}

          {/* 3단계: 결과 + 환불 */}
          {step === 'result' && reg && (
            <div>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal-muted">{t('manageStatusLabel')}</dt>
                  <dd className="font-semibold text-charcoal-deep">{t(STATUS_KEY[reg.status])}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal-muted">{t('managePartyLabel')}</dt>
                  <dd className="text-charcoal-deep">{reg.partySize}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-charcoal-muted">{t('manageAmountLabel')}</dt>
                  <dd className="text-charcoal-deep">{reg.amount.toLocaleString('ko-KR')}원</dd>
                </div>
              </dl>

              {!refunded && reg.refundable && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={refund}
                    disabled={pending}
                    className="w-full rounded-full border-2 border-danger bg-white px-6 py-3 text-base font-semibold text-danger-a11y transition hover:bg-danger/5 disabled:opacity-50"
                  >
                    {pending ? t('manageRefunding') : t('manageRefundBtn')}
                  </button>
                  <p className="mt-2 text-xs text-charcoal-muted break-keep">
                    {t('manageRefundNote')}
                  </p>
                </div>
              )}

              {!refunded && reg.refundClosed && (
                <p className="mt-5 rounded-lg bg-canvas px-4 py-3 text-sm text-charcoal break-keep">
                  {t('manageRefundClosed')}
                </p>
              )}

              {!refunded && reg.cancellable && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={cancelDeposit}
                    disabled={pending}
                    className="w-full rounded-full border-2 border-danger bg-white px-6 py-3 text-base font-semibold text-danger-a11y transition hover:bg-danger/5 disabled:opacity-50"
                  >
                    {pending ? t('manageCancelling') : t('manageCancelBtn')}
                  </button>
                  <p className="mt-2 text-xs text-charcoal-muted break-keep">
                    {t('manageCancelNote')}
                  </p>
                </div>
              )}

              {!refunded && !reg.refundable && !reg.refundClosed && !reg.cancellable && (
                <p className="mt-5 text-sm text-charcoal-muted break-keep">
                  {t('manageNotRefundable')}
                </p>
              )}
            </div>
          )}

          {notice && (
            <output className="block mt-4 rounded-lg bg-canvas px-4 py-3 text-sm text-charcoal break-keep">
              {notice}
            </output>
          )}
        </div>
      </div>
    </main>
  );
}
