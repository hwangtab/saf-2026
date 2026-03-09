'use client';

import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import Button from '@/components/ui/Button';
import { LegalDocumentContent } from '@/components/auth/LegalDocumentContent';
import { IncompleteItemsModal, type IncompleteItem } from '@/components/ui/IncompleteItemsModal';
import { submitArtistApplication, type OnboardingState } from '@/app/actions/onboarding';
import { CheckMarkIcon } from '@/components/ui/Icons';
import { ARTIST_APPLICATION_TERMS_VERSION } from '@/lib/constants';
import {
  ARTIST_APPLICATION_TERMS_DOCUMENT,
  PRIVACY_POLICY_DOCUMENT,
  TERMS_OF_SERVICE_DOCUMENT,
} from '@/lib/legal-documents';

const initialState: OnboardingState = {
  message: '',
  error: false,
};

type OnboardingDefaults = {
  artist_name?: string | null;
  contact?: string | null;
  bio?: string | null;
  referrer?: string | null;
} | null;

export function OnboardingForm({ defaultValues }: { defaultValues?: OnboardingDefaults }) {
  const [state, formAction, isPending] = useActionState(submitArtistApplication, initialState);
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const termsContainerRef = useRef<HTMLDivElement>(null);
  const submitTriggerRef = useRef<HTMLElement | null>(null);

  const canSubmit = hasReadTerms && termsAccepted;
  const incompleteItems = useMemo(() => {
    const items: IncompleteItem[] = [];

    if (!hasReadTerms) {
      items.push({
        label: '전시·판매위탁 계약서',
        reason: '문서 하단까지 스크롤해주세요.',
        targetId: 'artist-contract-section',
      });
    }

    if (hasReadTerms && !termsAccepted) {
      items.push({
        label: '약관/방침 동의',
        reason: '동의 체크박스를 선택해주세요.',
        targetId: 'artist-agreement-section',
      });
    }

    return items;
  }, [hasReadTerms, termsAccepted]);

  const handleCloseIncompleteModal = () => {
    setIsIncompleteModalOpen(false);
    const trigger = submitTriggerRef.current;
    if (trigger) {
      window.requestAnimationFrame(() => trigger.focus());
    }
  };

  const handleSelectIncompleteItem = (item: IncompleteItem) => {
    setIsIncompleteModalOpen(false);
    if (!item.targetId) return;

    const section = document.getElementById(item.targetId);
    if (!section) return;

    section.scrollIntoView({ behavior: 'smooth', block: 'center' });

    window.requestAnimationFrame(() => {
      const focusTarget =
        section.querySelector<HTMLElement>('[role="region"]') ??
        section.querySelector<HTMLElement>('input[type="checkbox"]:not([disabled])') ??
        section.querySelector<HTMLElement>(
          'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
      focusTarget?.focus();
    });
  };

  const handleSubmitAttempt = (event: React.FormEvent<HTMLFormElement>) => {
    if (isPending || canSubmit) return;
    event.preventDefault();
    submitTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsIncompleteModalOpen(true);
  };

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadTerms) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadTerms(true);
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
    };

    checkScrollableState();
    window.addEventListener('resize', checkScrollableState);
    return () => window.removeEventListener('resize', checkScrollableState);
  }, []);

  return (
    <form action={formAction} className="space-y-6" onSubmit={handleSubmitAttempt}>
      <div>
        <label htmlFor="artist_name" className="block text-sm font-medium text-gray-700">
          작가명 <span className="text-red-500">*</span>
        </label>
        <div className="mt-1">
          <input
            id="artist_name"
            name="artist_name"
            type="text"
            required
            defaultValue={defaultValues?.artist_name || ''}
            className="shadow-sm focus:ring-black focus:border-black block w-full sm:text-sm border-gray-300 rounded-md"
            placeholder="활동명 또는 작가명"
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
            placeholder="간단한 소개를 입력해주세요."
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

      <div
        id="artist-onboarding-consent-section"
        className="rounded-lg border border-gray-200 bg-gray-50 p-4"
      >
        <input type="hidden" name="terms_version" value={ARTIST_APPLICATION_TERMS_VERSION} />
        <input type="hidden" name="terms_read_complete" value={hasReadTerms ? '1' : '0'} />

        <div className="space-y-3">
          <div id="artist-contract-section">
            <p id="artist-terms-heading" className="mb-2 text-xs font-semibold text-gray-700">
              전시·판매위탁 계약서 전문
            </p>
            <div
              ref={termsContainerRef}
              className="max-h-[52vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[65vh]"
              onScroll={handleTermsScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="artist-terms-heading"
            >
              <LegalDocumentContent document={ARTIST_APPLICATION_TERMS_DOCUMENT} />
            </div>
            {!hasReadTerms && (
              <p className="mt-1 text-xs text-amber-700">문서 하단까지 스크롤해주세요.</p>
            )}
          </div>

          <div id="artist-tos-section">
            <p id="tos-heading" className="mb-2 text-xs font-semibold text-gray-700">
              이용약관 전문
            </p>
            <div
              className="max-h-[52vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[65vh]"
              tabIndex={0}
              role="region"
              aria-labelledby="tos-heading"
            >
              <LegalDocumentContent document={TERMS_OF_SERVICE_DOCUMENT} />
            </div>
          </div>

          <div id="artist-privacy-section">
            <p id="privacy-policy-heading" className="mb-2 text-xs font-semibold text-gray-700">
              개인정보처리방침 전문
            </p>
            <div
              className="max-h-[52vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[65vh]"
              tabIndex={0}
              role="region"
              aria-labelledby="privacy-policy-heading"
            >
              <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
            </div>
          </div>
        </div>

        <div id="artist-agreement-section" className="mt-4 flex items-start gap-3">
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            disabled={!hasReadTerms}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <div className="text-sm">
            <label htmlFor="terms_accepted" className="font-medium text-gray-700">
              전시·판매위탁 계약서, 이용약관 및 개인정보처리방침에 동의합니다.{' '}
              <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-gray-500">계약서 전문을 읽어야 체크할 수 있습니다.</p>
            <p className="mt-1 text-xs text-gray-400">
              계약서 원문:{' '}
              <Link href="/terms/artist" className="underline underline-offset-2">
                전시·판매위탁 계약서
              </Link>{' '}
              /{' '}
              <Link href="/terms" className="underline underline-offset-2">
                이용약관
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
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            제출하기
          </Button>
        </div>
      </div>
      <IncompleteItemsModal
        isOpen={isIncompleteModalOpen}
        onClose={handleCloseIncompleteModal}
        title="아직 완료되지 않은 항목이 있어요"
        description="아래 항목을 완료하면 제출할 수 있습니다."
        items={incompleteItems}
        onSelectItem={handleSelectIncompleteItem}
      />
    </form>
  );
}
