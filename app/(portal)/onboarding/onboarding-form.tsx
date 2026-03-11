'use client';

import { type RefObject, useActionState, useEffect, useMemo, useRef, useState } from 'react';
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
  const [hasReadTos, setHasReadTos] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const termsContainerRef = useRef<HTMLDivElement>(null);
  const tosContainerRef = useRef<HTMLDivElement>(null);
  const privacyContainerRef = useRef<HTMLDivElement>(null);
  const submitTriggerRef = useRef<HTMLElement | null>(null);

  const allRead = hasReadTerms && hasReadTos && hasReadPrivacy;
  const canSubmit = allRead && termsAccepted;
  const incompleteItems = useMemo(() => {
    const items: IncompleteItem[] = [];

    if (!hasReadTerms) {
      items.push({
        label: '전시·판매위탁 계약서',
        reason: '문서 하단까지 스크롤해주세요.',
        targetId: 'artist-contract-section',
      });
    }

    if (!hasReadTos) {
      items.push({
        label: '이용약관',
        reason: '문서 하단까지 스크롤해주세요.',
        targetId: 'artist-tos-section',
      });
    }

    if (!hasReadPrivacy) {
      items.push({
        label: '개인정보처리방침',
        reason: '문서 하단까지 스크롤해주세요.',
        targetId: 'artist-privacy-section',
      });
    }

    if (allRead && !termsAccepted) {
      items.push({
        label: '약관/방침 동의',
        reason: '동의 체크박스를 선택해주세요.',
        targetId: 'artist-agreement-section',
      });
    }

    return items;
  }, [hasReadTerms, hasReadTos, hasReadPrivacy, allRead, termsAccepted]);

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

  const nudgeScroll = (containerRef: RefObject<HTMLDivElement | null>) => {
    containerRef.current?.scrollBy({ top: 80, behavior: 'smooth' });
  };

  const handleTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadTerms) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadTerms(true);
    }
  };

  const handleTosScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadTos) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadTos(true);
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
        tosContainerRef.current &&
        tosContainerRef.current.scrollHeight <= tosContainerRef.current.clientHeight + 1
      ) {
        setHasReadTos(true);
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

  // 아직 읽지 않은 첫 번째 문서의 ref를 반환
  const firstUnreadRef = !hasReadTerms
    ? termsContainerRef
    : !hasReadTos
      ? tosContainerRef
      : !hasReadPrivacy
        ? privacyContainerRef
        : null;

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
            <div className="relative">
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
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    아래로 스크롤하세요 ↓
                  </span>
                </div>
              )}
            </div>
            {!hasReadTerms && (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-sm text-amber-600">↓</span>
                <p className="text-xs font-medium text-amber-800">
                  문서 하단까지 스크롤하면 동의 항목이 활성화됩니다.
                </p>
              </div>
            )}
          </div>

          <div id="artist-tos-section">
            <p id="tos-heading" className="mb-2 text-xs font-semibold text-gray-700">
              이용약관 전문
            </p>
            <div className="relative">
              <div
                ref={tosContainerRef}
                className="max-h-[52vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[65vh]"
                onScroll={handleTosScroll}
                tabIndex={0}
                role="region"
                aria-labelledby="tos-heading"
              >
                <LegalDocumentContent document={TERMS_OF_SERVICE_DOCUMENT} />
              </div>
              {!hasReadTos && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    아래로 스크롤하세요 ↓
                  </span>
                </div>
              )}
            </div>
            {!hasReadTos && (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-sm text-amber-600">↓</span>
                <p className="text-xs font-medium text-amber-800">
                  문서 하단까지 스크롤하면 동의 항목이 활성화됩니다.
                </p>
              </div>
            )}
          </div>

          <div id="artist-privacy-section">
            <p id="privacy-policy-heading" className="mb-2 text-xs font-semibold text-gray-700">
              개인정보처리방침 전문
            </p>
            <div className="relative">
              <div
                ref={privacyContainerRef}
                className="max-h-[52vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[65vh]"
                onScroll={handlePrivacyScroll}
                tabIndex={0}
                role="region"
                aria-labelledby="privacy-policy-heading"
              >
                <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
              </div>
              {!hasReadPrivacy && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    아래로 스크롤하세요 ↓
                  </span>
                </div>
              )}
            </div>
            {!hasReadPrivacy && (
              <div className="mt-1 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-sm text-amber-600">↓</span>
                <p className="text-xs font-medium text-amber-800">
                  문서 하단까지 스크롤하면 동의 항목이 활성화됩니다.
                </p>
              </div>
            )}
          </div>
        </div>

        <div
          id="artist-agreement-section"
          className="mt-4 flex items-start gap-3"
          onClick={!allRead && firstUnreadRef ? () => nudgeScroll(firstUnreadRef) : undefined}
          role={!allRead ? 'button' : undefined}
          tabIndex={!allRead ? 0 : undefined}
        >
          <input
            id="terms_accepted"
            name="terms_accepted"
            type="checkbox"
            checked={termsAccepted}
            onChange={(event) => setTermsAccepted(event.target.checked)}
            disabled={!allRead}
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
          />
          <div className="text-sm">
            <label htmlFor="terms_accepted" className="font-medium text-gray-700">
              전시·판매위탁 계약서, 이용약관 및 개인정보처리방침에 동의합니다.{' '}
              <span className="text-red-500">*</span>
            </label>
            <p className="mt-1 text-gray-500">
              {allRead
                ? '모든 문서를 읽었습니다. 체크하여 동의해주세요.'
                : '위 문서를 모두 끝까지 스크롤해주세요.'}
            </p>
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
