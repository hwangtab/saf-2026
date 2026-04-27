'use client';

import { useState, useTransition } from 'react';
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

const PRIVACY_BLURB =
  '수집 항목: 성함, 이메일, 거주 지역. ' +
  '이용 목적: 청원 집계, 차기 서울시장 후보 측 전달, 진행 상황 안내. ' +
  '보유 기간: 청원 종료 후 6개월. ' +
  '수집 주체: 한국스마트협동조합 (예술인협동조합). 동의 거부 시 청원에 참여하실 수 없습니다.';

const OVERSEAS_BLURB =
  '청원 응답 저장은 Supabase Inc.(인도 뭄바이), 호스팅은 Vercel Inc.에 ' +
  '위탁되어 국외로 이전됩니다. 이전 거부 시 청원에 참여하실 수 없습니다.';

export default function SignForm() {
  const t = useTranslations('petition.ohYoon');

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
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

  if (result?.ok) {
    return (
      <div
        className="rounded-xl border border-primary/30 bg-canvas-soft px-6 py-10 text-center"
        role="status"
        aria-live="polite"
      >
        <h3 className="font-display text-2xl text-charcoal-deep mb-2 break-keep">
          서명해 주셔서 감사합니다.
        </h3>
        <p className="text-base text-charcoal leading-relaxed mb-4 break-keep">
          오윤의 작품을 시민의 품으로.
          <br />이 청원을 다섯 분께만 더 전해 주시면 1만 명의 이름이 모입니다.
        </p>
        <p className="text-sm text-charcoal-muted">
          입력하신 이메일로 영수증과 진행 상황 안내를 보내드립니다.
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
      {/* 성함 */}
      <div>
        <label htmlFor="petition-full-name" className={LABEL_BASE}>
          성함 <span className="text-danger">*</span>
        </label>
        <input
          id="petition-full-name"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          maxLength={100}
          required
          autoComplete="name"
          className={INPUT_BASE}
        />
        {fieldError('fullName') && <p className={ERROR_TEXT}>{fieldError('fullName')}</p>}
      </div>

      {/* 이메일 */}
      <div>
        <label htmlFor="petition-email" className={LABEL_BASE}>
          이메일 <span className="text-danger">*</span>
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
        <p className="mt-1.5 text-xs text-charcoal-muted">
          청원의 진행 상황과 결과를 이 메일로 정중히 알려드립니다.
        </p>
        {fieldError('email') && <p className={ERROR_TEXT}>{fieldError('email')}</p>}
      </div>

      {/* 거주 지역 — 시·도 + 시·군·구 (시·군·구까지만; 상세 주소는 받지 않음) */}
      <div>
        <label htmlFor="petition-region-top" className={LABEL_BASE}>
          거주 지역 <span className="text-danger">*</span>
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
      <div className="flex items-start gap-3 rounded-lg bg-canvas-soft p-4">
        <input
          id="petition-committee"
          type="checkbox"
          checked={isCommittee}
          onChange={(e) => setIsCommittee(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
        />
        <label htmlFor="petition-committee" className="text-sm text-charcoal break-keep">
          <span className="font-semibold">서명에 더해, 시민 추진위원으로도 참여합니다.</span>
          <br />
          <span className="text-charcoal-muted">
            추진위원회 발족 선언문에 이름이 함께 오릅니다. 별도의 시간 부담은 없습니다.
          </span>
        </label>
      </div>

      {/* 차기 서울시장께 한 마디 */}
      <div>
        <label htmlFor="petition-message" className={LABEL_BASE}>
          차기 서울시장께 한 마디{' '}
          <span className="text-charcoal-muted text-xs font-normal">(선택)</span>
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
          <div className="mt-2 flex items-start gap-3 rounded-lg bg-canvas-soft p-3">
            <input
              id="petition-message-public"
              type="checkbox"
              checked={messagePublic}
              onChange={(e) => setMessagePublic(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="petition-message-public" className="text-xs text-charcoal break-keep">
              이 메시지가 익명/실명 형태로 공개·발췌되는 데 동의합니다. 미동의 시 비공개 통계로만
              사용됩니다.
            </label>
          </div>
        )}
        {fieldError('message') && <p className={ERROR_TEXT}>{fieldError('message')}</p>}
      </div>

      {/* 동의 3종 */}
      <fieldset className="space-y-3 rounded-lg border border-gray-200 p-4">
        <legend className="px-2 text-sm font-semibold text-charcoal-deep">필수 동의</legend>

        <label className="flex items-start gap-3 text-sm text-charcoal break-keep cursor-pointer">
          <input
            type="checkbox"
            checked={agreedPetition}
            onChange={(e) => setAgreedPetition(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            required
          />
          <span>
            <strong>[필수]</strong> 차기 서울시장께서 오윤의 1974년 구의동 벽화의 안전한
            해체·보존·이관을 해결해 주십시오. — 위 청원에 동의하며 서명합니다.
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
            <strong>[필수]</strong> 개인정보 수집·이용에 동의합니다.{' '}
            <span className="text-charcoal-muted">{PRIVACY_BLURB}</span>
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
            <strong>[필수]</strong> 개인정보 국외 이전에 동의합니다.{' '}
            <span className="text-charcoal-muted">{OVERSEAS_BLURB}</span>
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
        className="w-full inline-flex items-center justify-center rounded-lg px-6 py-4 text-lg font-bold bg-primary hover:bg-primary-strong text-white transition-all hover:scale-[1.01] hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {pending ? '제출 중…' : `${t('heroCta')} →`}
      </button>

      <p className="text-xs text-charcoal-muted text-center">
        서명은 30초입니다. 입력하신 정보는 청원 운영에만 사용되며, 청원 종료 후 6개월 내 파기됩니다.
      </p>
      <p className="text-[11px] text-charcoal-muted text-center">{t('formAgeNotice')}</p>
    </form>
  );
}
