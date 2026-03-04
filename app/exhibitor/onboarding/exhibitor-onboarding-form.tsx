'use client';

import { useActionState, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { LegalDocumentContent } from '@/components/auth/LegalDocumentContent';
import {
  submitExhibitorApplication,
  type ExhibitorOnboardingState,
} from '@/app/actions/exhibitor-onboarding';
import { CheckMarkIcon } from '@/components/ui/Icons';
import { EXHIBITOR_APPLICATION_TERMS_VERSION } from '@/lib/constants';
import {
  EXHIBITOR_APPLICATION_TERMS_DOCUMENT,
  PRIVACY_POLICY_DOCUMENT,
} from '@/lib/legal-documents';

const initialState: ExhibitorOnboardingState = {
  message: '',
  error: false,
};

type OnboardingDefaults = {
  representative_name?: string | null;
  contact?: string | null;
  bio?: string | null;
  referrer?: string | null;
} | null;

export function ExhibitorOnboardingForm({ defaultValues }: { defaultValues?: OnboardingDefaults }) {
  const [state, formAction, isPending] = useActionState(submitExhibitorApplication, initialState);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const termsContainerRef = useRef<HTMLDivElement>(null);
  const privacyContainerRef = useRef<HTMLDivElement>(null);

  const canEnableAgreement = hasReadTerms && hasReadPrivacy;
  const canSubmit = canEnableAgreement && termsAccepted && !isPending;

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadTerms) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadTerms(true);
    }
  };

  const handlePrivacyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadPrivacy) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadPrivacy(true);
    }
  };

  useEffect(() => {
    const checkScrollableState = () => {
      if (
        termsContainerRef.current &&
        termsContainerRef.current.scrollHeight <= termsContainerRef.current.clientHeight + 1
      ) {
        setHasReadTerms(true);
      }

      if (
        privacyContainerRef.current &&
        privacyContainerRef.current.scrollHeight <= privacyContainerRef.current.clientHeight + 1
      ) {
        setHasReadPrivacy(true);
      }
    };

    checkScrollableState();
    window.addEventListener('resize', checkScrollableState);
    return () => window.removeEventListener('resize', checkScrollableState);
  }, []);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="representative_name" className="block text-sm font-medium text-gray-700">
          대표명 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="representative_name"
            name="representative_name"
            type="text"
            required
            defaultValue={defaultValues?.representative_name || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="개인명 또는 단체명 (갤러리, 큐레이터 등)"
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-gray-700">
          연락처 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="contact"
            name="contact"
            type="text"
            required
            defaultValue={defaultValues?.contact || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="이메일 또는 전화번호"
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
          자기 소개 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <textarea
            id="bio"
            name="bio"
            rows={5}
            required
            defaultValue={defaultValues?.bio || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="간단한 소개를 입력해주세요. (갤러리 소개, 활동 분야 등)"
          />
        </div>
      </div>

      <div>
        <label htmlFor="referrer" className="block text-sm font-medium text-gray-700">
          추천인 <span className="text-gray-400 font-normal">(선택)</span>
        </label>
        <div className="mt-1">
          <input
            id="referrer"
            name="referrer"
            type="text"
            defaultValue={defaultValues?.referrer || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="추천인 이름 또는 연락처"
          />
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input type="hidden" name="terms_version" value={EXHIBITOR_APPLICATION_TERMS_VERSION} />
        <input type="hidden" name="terms_read_complete" value={hasReadTerms ? '1' : '0'} />
        <input type="hidden" name="privacy_read_complete" value={hasReadPrivacy ? '1' : '0'} />

        <p className="mb-3 text-sm text-gray-600">
          아래 계약서 전문과 개인정보처리방침을 끝까지 읽으면 동의 체크가 활성화됩니다.
        </p>

        <div className="space-y-3">
          <div>
            <p id="exhibitor-terms-heading" className="mb-2 text-xs font-semibold text-gray-700">
              출품자 전시위탁 계약서 전문
            </p>
            <div
              ref={termsContainerRef}
              className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-3"
              onScroll={handleTermsScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="exhibitor-terms-heading"
            >
              <LegalDocumentContent document={EXHIBITOR_APPLICATION_TERMS_DOCUMENT} />
            </div>
            {!hasReadTerms && (
              <p className="mt-1 text-xs text-amber-700">문서 하단까지 스크롤해주세요.</p>
            )}
          </div>

          <div>
            <p id="privacy-policy-heading" className="mb-2 text-xs font-semibold text-gray-700">
              개인정보처리방침 전문
            </p>
            <div
              ref={privacyContainerRef}
              className="max-h-80 overflow-y-auto rounded-md border border-gray-200 bg-white p-3"
              onScroll={handlePrivacyScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="privacy-policy-heading"
            >
              <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
            </div>
            {!hasReadPrivacy && (
              <p className="mt-1 text-xs text-amber-700">문서 하단까지 스크롤해주세요.</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-start gap-3">
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            required
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            disabled={!canEnableAgreement}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <div className="text-sm">
            <label htmlFor="terms_accepted" className="font-medium text-gray-700">
              출품자 전시위탁 계약서 및 개인정보처리방침에 동의합니다.{' '}
              <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-gray-500">전체 문서를 읽어야 체크할 수 있습니다.</p>
            <p className="mt-1 text-xs text-gray-400">
              계약서 원문:{' '}
              <Link href="/terms/exhibitor" className="underline underline-offset-2">
                출품자 전시위탁 계약서
              </Link>{' '}
              /{' '}
              <Link href="/privacy" className="underline underline-offset-2">
                개인정보처리방침
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-end items-center gap-4">
          {state.error && <p className="text-red-500 text-sm">{state.message}</p>}
          {state.message && !state.error && (
            <p className="text-green-600 text-sm flex items-center gap-1">
              <CheckMarkIcon />
              제출 완료
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={!canSubmit} variant="secondary">
            제출하기
          </Button>
        </div>
      </div>
    </form>
  );
}
