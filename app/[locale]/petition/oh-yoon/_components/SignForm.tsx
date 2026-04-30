'use client';

import { useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';

import RegionSelect from './RegionSelect';
import { signPetition } from '@/app/actions/petition';
import type { SignPetitionInput, SignPetitionResult } from '@/app/actions/petition';

const INPUT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ' +
  'disabled:bg-gray-100';

const LABEL_BASE = 'block text-sm font-semibold text-charcoal-deep mb-1.5';

const ERROR_TEXT = 'mt-1.5 text-sm text-danger';

export default function SignForm() {
  const t = useTranslations('petition.ohYoon');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [regionTop, setRegionTop] = useState('');
  const [regionSub, setRegionSub] = useState('');
  const [isCommittee, setIsCommittee] = useState(false);
  const [message, setMessage] = useState('');
  const [messagePublic, setMessagePublic] = useState(false);
  const [agreedPetition, setAgreedPetition] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [agreedOverseas, setAgreedOverseas] = useState(false);

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<SignPetitionResult | null>(null);

  // 서명 성공 시 11부 오윤 40주기 헌사 섹션 머리로 부드럽게 스크롤.
  // SectionTitle을 타겟으로 잡아 에디토리얼 헤더부터 읽히게 함.
  // 1.5초 지연으로 사용자가 성공 메시지를 먼저 보게 하고,
  // prefers-reduced-motion 사용자는 즉시 점프.
  useEffect(() => {
    if (!result?.ok) return;
    const target = document.getElementById('petition-tribute-title');
    if (!target) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const timer = window.setTimeout(() => {
      target.scrollIntoView({
        behavior: reduceMotion ? 'auto' : 'smooth',
        block: 'start',
      });
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [result?.ok]);

  if (result?.ok) {
    return (
      <div
        className="rounded-xl border border-primary/30 bg-canvas px-6 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <h3 className="font-display font-bold text-2xl text-charcoal-deep mb-2 break-keep">
          {t('successTitle')}
        </h3>
        <p className="text-base text-charcoal leading-relaxed mb-4 break-keep whitespace-pre-line">
          {t('successBody')}
        </p>
        <p className="text-sm text-charcoal-muted mb-4">{t('successFooter')}</p>
        <p className="text-xs font-semibold text-primary-strong break-keep">
          {t('successScrollHint')}
        </p>
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (pending) return;

    startTransition(async () => {
      const res = await signPetition({
        fullName,
        email,
        phone,
        regionTop,
        regionSub,
        isCommittee,
        message,
        messagePublic,
        agreedPetition,
        agreedPrivacy,
        agreedOverseas,
      });
      setResult(res);
    });
  }

  const fieldError = (key: keyof SignPetitionInput): string | undefined => {
    if (!result || result.ok || !result.errors) return undefined;
    return result.errors[key];
  };

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-5 rounded-xl bg-white p-6 md:p-8 shadow-sm border border-gray-200"
    >
      {/* 성함 — 주민등록상 본명 (닉네임·별명은 청원 효력에 영향) */}
      <div>
        <label htmlFor="petition-full-name" className={LABEL_BASE}>
          {t('formNameLabel')}{' '}
          <span className="text-charcoal-muted text-xs font-normal">{t('formNameHint')}</span>{' '}
          <span className="text-danger">*</span>
        </label>
        <input
          id="petition-full-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={100}
          required
          autoComplete="name"
          placeholder={t('formNamePlaceholder')}
          className={INPUT_BASE}
        />
        {fieldError('fullName') && <p className={ERROR_TEXT}>{fieldError('fullName')}</p>}
      </div>

      {/* 이메일 */}
      <div>
        <label htmlFor="petition-email" className={LABEL_BASE}>
          {t('formEmailLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="petition-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          required
          autoComplete="email"
          inputMode="email"
          className={INPUT_BASE}
        />
        <p className="mt-1.5 text-xs text-charcoal-muted">{t('formEmailHelp')}</p>
        {fieldError('email') && <p className={ERROR_TEXT}>{fieldError('email')}</p>}
      </div>

      {/* 전화번호 — 평문 저장(연락 목적). 형식 자유, 숫자 9~15자리 검증. */}
      <div>
        <label htmlFor="petition-phone" className={LABEL_BASE}>
          {t('formPhoneLabel')} <span className="text-danger">*</span>
        </label>
        <input
          id="petition-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          maxLength={30}
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder="010-1234-5678"
          className={INPUT_BASE}
        />
        <p className="mt-1.5 text-xs text-charcoal-muted">{t('formPhoneHelp')}</p>
        {fieldError('phone') && <p className={ERROR_TEXT}>{fieldError('phone')}</p>}
      </div>

      {/* 거주 지역 — 시·도 + 시·군·구 (시·군·구까지만; 상세 주소는 받지 않음) */}
      <div>
        <label htmlFor="petition-region-top" className={LABEL_BASE}>
          {t('formRegionLabel')} <span className="text-danger">*</span>
        </label>
        <RegionSelect
          topValue={regionTop}
          subValue={regionSub}
          onChange={(top, sub) => {
            setRegionTop(top);
            setRegionSub(sub);
          }}
        />
        {fieldError('regionTop') && <p className={ERROR_TEXT}>{fieldError('regionTop')}</p>}
      </div>

      {/* 시민 추진위원 */}
      <div className="flex items-start gap-3 rounded-lg bg-canvas p-4">
        <input
          id="petition-committee"
          type="checkbox"
          checked={isCommittee}
          onChange={(e) => setIsCommittee(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="petition-committee" className="text-sm text-charcoal break-keep">
          <span className="font-semibold">{t('formCommitteeTitle')}</span>
          <br />
          <span className="text-charcoal-muted">{t('formCommitteeHint')}</span>
        </label>
      </div>

      {/* 차기 서울시장께 한 마디 */}
      <div>
        <label htmlFor="petition-message" className={LABEL_BASE}>
          {t('formMessageLabel')}{' '}
          <span className="text-charcoal-muted text-xs font-normal">
            {t('formMessageOptional')}
          </span>
        </label>
        <textarea
          id="petition-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          maxLength={500}
          rows={3}
          className={INPUT_BASE}
        />
        <p className="mt-1.5 text-xs text-charcoal-muted text-right">{message.length}/500</p>
        {message.length > 0 && (
          <div className="mt-2 flex items-start gap-3 rounded-lg bg-canvas p-3">
            <input
              id="petition-message-public"
              type="checkbox"
              checked={messagePublic}
              onChange={(e) => setMessagePublic(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="petition-message-public" className="text-xs text-charcoal break-keep">
              {t('formMessagePublic')}
            </label>
          </div>
        )}
        {fieldError('message') && <p className={ERROR_TEXT}>{fieldError('message')}</p>}
      </div>

      {/* 동의 3종 */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-semibold text-charcoal-deep">
          {t('formConsentTitle')}
        </legend>

        <label className="flex items-start gap-3 text-sm text-charcoal break-keep cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPetition}
            onChange={(e) => setAgreedPetition(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            required
          />
          <span>
            <strong>{t('formConsentRequired')}</strong> {t('formConsentPetition')}
          </span>
        </label>
        {fieldError('agreedPetition') && (
          <p className={ERROR_TEXT}>{fieldError('agreedPetition')}</p>
        )}

        <label className="flex items-start gap-3 text-sm text-charcoal break-keep cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPrivacy}
            onChange={(e) => setAgreedPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            required
          />
          <span>
            <strong>{t('formConsentRequired')}</strong> {t('formConsentPrivacy')}{' '}
            <span className="text-charcoal-muted">{t('formPrivacyBlurb')}</span>
          </span>
        </label>
        {fieldError('agreedPrivacy') && <p className={ERROR_TEXT}>{fieldError('agreedPrivacy')}</p>}

        <label className="flex items-start gap-3 text-sm text-charcoal break-keep cursor-pointer">
          <input
            type="checkbox"
            checked={agreedOverseas}
            onChange={(e) => setAgreedOverseas(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            required
          />
          <span>
            <strong>{t('formConsentRequired')}</strong> {t('formConsentOverseas')}{' '}
            <span className="text-charcoal-muted">{t('formOverseasBlurb')}</span>
          </span>
        </label>
        {fieldError('agreedOverseas') && (
          <p className={ERROR_TEXT}>{fieldError('agreedOverseas')}</p>
        )}
      </fieldset>

      {/* 결과 메시지 */}
      {result && !result.ok && result.message && (
        <p
          role="alert"
          className="rounded-lg border-2 border-danger/40 bg-white px-4 py-3 text-sm text-danger-a11y"
        >
          {result.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center rounded-lg px-6 py-4 text-lg font-bold bg-primary hover:bg-primary-strong text-white transition-all hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {pending ? t('formSubmitting') : `${t('heroCta')} →`}
      </button>

      <p className="text-xs text-charcoal-muted text-center">{t('formFooter')}</p>
      <p className="text-[11px] text-charcoal-muted text-center">{t('formAgeNotice')}</p>
    </form>
  );
}
