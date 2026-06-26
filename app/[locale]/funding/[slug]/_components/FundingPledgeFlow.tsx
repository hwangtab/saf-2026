'use client';

import { useState, useTransition } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import clsx from 'clsx';

import Button from '@/components/ui/Button';
import SafeImage from '@/components/common/SafeImage';
import { createPledge } from '@/app/actions/funding';
import type { CreatePledgeResultCode } from '@/app/actions/funding';

interface Tier {
  id: string;
  title: string;
  description: string | null;
  amount: number;
  total_quantity: number | null;
  requires_shipping: boolean;
  reward_kind: string;
  image_url: string | null;
}

interface Props {
  slug: string;
  tiers: Tier[];
  remaining: Record<string, number | null>;
  isOpen: boolean;
  /** Toss domestic client key — pass from server page via getTossDomesticClientKey() */
  clientKey: string | null;
}

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary disabled:bg-gray-100';
const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';
const ERROR_TEXT = 'mt-1.5 text-sm text-danger';

const ERROR_CODE_MAP: Record<CreatePledgeResultCode, string> = {
  INVALID_INPUT: 'error.INVALID_INPUT',
  RATE_LIMITED: 'error.RATE_LIMITED',
  PROJECT_CLOSED: 'error.PROJECT_CLOSED',
  TIER_SOLD_OUT: 'error.TIER_SOLD_OUT',
  INTERNAL_ERROR: 'error.INTERNAL_ERROR',
};

export default function FundingPledgeFlow({ slug, tiers, remaining, isOpen, clientKey }: Props) {
  const t = useTranslations('funding');
  const locale = useLocale();

  const formatAmount = (n: number) =>
    locale === 'en' ? `₩${n.toLocaleString('en-US')}` : `${n.toLocaleString('ko-KR')}원`;

  const [selected, setSelected] = useState<Tier | null>(null);
  const [form, setForm] = useState({
    backerName: '',
    backerEmail: '',
    backerPhone: '',
    shippingName: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingPostalCode: '',
    shippingMemo: '',
    isAnonymous: false,
    supporterMessage: '',
    messagePublic: false,
  });
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function updateForm<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (!isOpen) {
    return (
      <p className="mt-8 rounded-xl bg-canvas-strong p-4 text-charcoal-muted">{t('closed')}</p>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    if (!selected) {
      setError(t('agreeRequired'));
      return;
    }
    if (!agreedTerms || !agreedPrivacy) {
      setError(t('agreeRequired'));
      return;
    }

    startTransition(async () => {
      setError(null);

      const res = await createPledge({
        projectSlug: slug,
        rewardTierId: selected.id,
        quantity: 1,
        backerName: form.backerName,
        backerEmail: form.backerEmail,
        backerPhone: form.backerPhone,
        shippingName: form.shippingName,
        shippingPhone: form.shippingPhone,
        shippingAddress: form.shippingAddress,
        shippingPostalCode: form.shippingPostalCode,
        shippingMemo: form.shippingMemo,
        isAnonymous: form.isAnonymous,
        supporterMessage: form.supporterMessage,
        messagePublic: form.messagePublic,
        agreedTerms,
        agreedPrivacy,
      });

      if (!res.ok) {
        setError(t(ERROR_CODE_MAP[res.code]));
        return;
      }

      if (!clientKey) {
        setError(t('error.INTERNAL_ERROR'));
        return;
      }

      // Toss SDK v2 결제창 — RegistrationForm·CheckoutClient 패턴 복제
      const { orderNo, amount } = res;
      const localePrefix = locale === 'en' ? '/en' : '';
      const successUrl = `${window.location.origin}${localePrefix}/funding/${slug}/success`;
      const failUrl = `${window.location.origin}${localePrefix}/funding/${slug}/fail`;

      try {
        const { loadTossPayments } = await import('@tosspayments/tosspayments-sdk');
        const tossPayments = await loadTossPayments(clientKey);
        // customerKey: orderNo — 비회원 결제, 매 결제마다 unique, 50자 이내
        const payment = tossPayments.payment({ customerKey: orderNo });
        await payment.requestPayment({
          method: 'CARD',
          amount: { currency: 'KRW', value: amount },
          orderId: orderNo,
          orderName: selected.title,
          customerName: form.backerName,
          ...(form.backerEmail ? { customerEmail: form.backerEmail } : {}),
          successUrl,
          failUrl,
        });
        // redirect 진행 중 — 페이지 unload까지 대기
        await new Promise(() => {});
      } catch (err: unknown) {
        // Toss SDK v2 에러는 { code, message }. USER_CANCEL은 결제창 닫기 — 에러 화면 생략.
        const e = err as { code?: string; message?: string };
        if (e?.code !== 'USER_CANCEL') {
          setError(e?.message ?? t('error.INTERNAL_ERROR'));
        }
      }
    });
  }

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold text-charcoal-deep">{t('rewardListTitle')}</h2>

      {/* 티어 카드 목록 */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {tiers.map((tier) => {
          const rem = remaining[tier.id];
          const soldOut = rem !== null && rem !== undefined && rem <= 0;
          const isSelected = selected?.id === tier.id;
          return (
            <button
              key={tier.id}
              type="button"
              disabled={soldOut}
              onClick={() => {
                if (!soldOut) setSelected(tier);
              }}
              className={clsx(
                'rounded-xl border p-4 text-left transition-[transform,box-shadow] duration-300',
                isSelected
                  ? 'border-primary-strong shadow-md ring-1 ring-primary-strong'
                  : 'border-gallery-hairline',
                soldOut ? 'cursor-not-allowed opacity-50' : 'hover:-translate-y-1 hover:shadow-lg'
              )}
              aria-pressed={isSelected}
            >
              {tier.image_url && (
                <SafeImage
                  src={tier.image_url}
                  alt={tier.title}
                  width={320}
                  height={200}
                  className="mb-3 w-full rounded-lg object-cover"
                />
              )}
              <div className="font-bold text-charcoal-deep">{formatAmount(tier.amount)}</div>
              <div className="mt-0.5 text-sm text-charcoal">{tier.title}</div>
              {tier.description && (
                <p className="mt-1 text-xs text-charcoal-muted">{tier.description}</p>
              )}
              {soldOut && (
                <span className="mt-2 inline-block text-xs font-semibold text-danger">
                  {t('rewardSoldOut')}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 폼 — 티어 선택 후 표시 */}
      {selected && (
        <form
          onSubmit={handleSubmit}
          noValidate
          className="mt-6 space-y-5 rounded-xl border border-gray-200 bg-white p-6 shadow-sm md:p-8"
        >
          <h3 className="text-lg font-bold text-charcoal-deep">{selected.title}</h3>

          {/* 후원자 정보 */}
          <div>
            <label htmlFor="pledge-name" className={LABEL_BASE}>
              {t('formNameLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="pledge-name"
              type="text"
              value={form.backerName}
              onChange={(e) => updateForm('backerName', e.target.value)}
              maxLength={100}
              required
              className={INPUT_BASE}
            />
          </div>

          <div>
            <label htmlFor="pledge-email" className={LABEL_BASE}>
              {t('formEmailLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="pledge-email"
              type="email"
              value={form.backerEmail}
              onChange={(e) => updateForm('backerEmail', e.target.value)}
              maxLength={200}
              required
              className={INPUT_BASE}
            />
          </div>

          <div>
            <label htmlFor="pledge-phone" className={LABEL_BASE}>
              {t('formPhoneLabel')} <span className="text-danger">*</span>
            </label>
            <input
              id="pledge-phone"
              type="tel"
              value={form.backerPhone}
              onChange={(e) => updateForm('backerPhone', e.target.value)}
              maxLength={30}
              required
              placeholder="010-1234-5678"
              className={INPUT_BASE}
            />
          </div>

          {/* 배송지 정보 — 실물 배송이 필요한 티어에만 표시 (디지털 리워드는 숨김) */}
          {selected.requires_shipping && (
            <div className="space-y-4 rounded-lg bg-canvas p-4">
              <p className="text-sm font-semibold text-charcoal-deep">
                {t('shippingSectionTitle')}
              </p>

              <div>
                <label htmlFor="pledge-shipping-name" className={LABEL_BASE}>
                  {t('shippingNameLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="pledge-shipping-name"
                  type="text"
                  value={form.shippingName}
                  onChange={(e) => updateForm('shippingName', e.target.value)}
                  maxLength={100}
                  required
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label htmlFor="pledge-shipping-phone" className={LABEL_BASE}>
                  {t('shippingPhoneLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="pledge-shipping-phone"
                  type="tel"
                  value={form.shippingPhone}
                  onChange={(e) => updateForm('shippingPhone', e.target.value)}
                  maxLength={30}
                  required
                  placeholder="010-1234-5678"
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label htmlFor="pledge-postal-code" className={LABEL_BASE}>
                  {t('postalCodeLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="pledge-postal-code"
                  type="text"
                  inputMode="numeric"
                  value={form.shippingPostalCode}
                  onChange={(e) => updateForm('shippingPostalCode', e.target.value)}
                  maxLength={10}
                  required
                  placeholder="12345"
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label htmlFor="pledge-address" className={LABEL_BASE}>
                  {t('addressLabel')} <span className="text-danger">*</span>
                </label>
                <input
                  id="pledge-address"
                  type="text"
                  value={form.shippingAddress}
                  onChange={(e) => updateForm('shippingAddress', e.target.value)}
                  maxLength={300}
                  required
                  className={INPUT_BASE}
                />
              </div>

              <div>
                <label htmlFor="pledge-memo" className={LABEL_BASE}>
                  {t('shippingMemoLabel')}
                </label>
                <input
                  id="pledge-memo"
                  type="text"
                  value={form.shippingMemo}
                  onChange={(e) => updateForm('shippingMemo', e.target.value)}
                  maxLength={200}
                  placeholder={t('shippingMemoPlaceholder')}
                  className={INPUT_BASE}
                />
              </div>
            </div>
          )}

          {/* 응원 메시지 (선택) */}
          <div>
            <label htmlFor="pledge-message" className={LABEL_BASE}>
              {t('supporterMessageLabel')}
            </label>
            <textarea
              id="pledge-message"
              value={form.supporterMessage}
              onChange={(e) => updateForm('supporterMessage', e.target.value)}
              maxLength={500}
              rows={3}
              className={`${INPUT_BASE} resize-none`}
            />
            <div className="mt-1 flex items-center gap-2">
              <input
                id="pledge-public"
                type="checkbox"
                checked={form.messagePublic}
                onChange={(e) => updateForm('messagePublic', e.target.checked)}
                className="h-4 w-4 rounded"
              />
              <label htmlFor="pledge-public" className="text-xs text-charcoal-muted">
                {t('messagePublicLabel')}
              </label>
            </div>
          </div>

          {/* 익명 후원 */}
          <div className="flex items-center gap-2">
            <input
              id="pledge-anonymous"
              type="checkbox"
              checked={form.isAnonymous}
              onChange={(e) => updateForm('isAnonymous', e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <label htmlFor="pledge-anonymous" className="text-sm text-charcoal">
              {t('anonymousLabel')}
            </label>
          </div>

          {/* 약관 동의 */}
          <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
            <legend className="sr-only">{t('consentGroupLabel')}</legend>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => setAgreedTerms(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span>{t('termsConsent')}</span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={agreedPrivacy}
                onChange={(e) => setAgreedPrivacy(e.target.checked)}
                required
                className="mt-0.5 h-4 w-4 rounded"
              />
              <span>{t('privacyConsent')}</span>
            </label>
          </fieldset>

          {/* 결제 금액 요약 */}
          <p className="text-right text-sm font-semibold text-charcoal-deep">
            {t('amountSummary', { amount: formatAmount(selected.amount) })}
          </p>

          {/* 에러 메시지 */}
          {error && (
            <p role="alert" className={ERROR_TEXT}>
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
            {pending ? t('submitting') : t('support')}
          </Button>
        </form>
      )}
    </div>
  );
}
