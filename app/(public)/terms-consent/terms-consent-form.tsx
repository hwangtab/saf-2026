'use client';

import Link from 'next/link';
import { useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { LegalDocumentContent } from '@/components/auth/LegalDocumentContent';
import { IncompleteItemsModal, type IncompleteItem } from '@/components/ui/IncompleteItemsModal';
import { submitTermsConsent, type TermsConsentState } from '@/app/actions/terms-consent';
import {
  ARTIST_APPLICATION_TERMS_VERSION,
  EXHIBITOR_APPLICATION_TERMS_VERSION,
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from '@/lib/constants';
import {
  ARTIST_APPLICATION_TERMS_DOCUMENT,
  EXHIBITOR_APPLICATION_TERMS_DOCUMENT,
  PRIVACY_POLICY_DOCUMENT,
  TERMS_OF_SERVICE_DOCUMENT,
} from '@/lib/legal-documents';

const initialState: TermsConsentState = {
  message: '',
  error: false,
};

type TermsConsentFormProps = {
  nextPath: string;
  needsArtistConsent: boolean;
  needsExhibitorConsent: boolean;
  needsPrivacyConsent: boolean;
  needsTosConsent: boolean;
};

export function TermsConsentForm({
  nextPath,
  needsArtistConsent,
  needsExhibitorConsent,
  needsPrivacyConsent,
  needsTosConsent,
}: TermsConsentFormProps) {
  const [state, formAction, isPending] = useActionState(submitTermsConsent, initialState);
  const [hasReadArtistTerms, setHasReadArtistTerms] = useState(false);
  const [hasReadExhibitorTerms, setHasReadExhibitorTerms] = useState(false);
  const hasReadPrivacy = true;
  const hasReadTos = true;
  const [artistAgreed, setArtistAgreed] = useState(false);
  const [exhibitorAgreed, setExhibitorAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const artistTermsContainerRef = useRef<HTMLDivElement>(null);
  const exhibitorTermsContainerRef = useRef<HTMLDivElement>(null);
  const submitTriggerRef = useRef<HTMLElement | null>(null);

  const artistReady = !needsArtistConsent || (hasReadArtistTerms && artistAgreed);
  const exhibitorReady = !needsExhibitorConsent || (hasReadExhibitorTerms && exhibitorAgreed);
  const privacyReady = !needsPrivacyConsent || (hasReadPrivacy && privacyAgreed);
  const tosReady = !needsTosConsent || (hasReadTos && tosAgreed);
  const canSubmit = artistReady && exhibitorReady && privacyReady && tosReady;

  const incompleteItems = useMemo(() => {
    const items: IncompleteItem[] = [];

    if (needsArtistConsent) {
      if (!hasReadArtistTerms) {
        items.push({
          label: '전시·판매위탁 계약서',
          reason: '문서 하단까지 스크롤해주세요.',
          targetId: 'artist-consent-section',
        });
      } else if (!artistAgreed) {
        items.push({
          label: '전시·판매위탁 계약서',
          reason: '동의 체크박스를 선택해주세요.',
          targetId: 'artist-consent-section',
        });
      }
    }

    if (needsExhibitorConsent) {
      if (!hasReadExhibitorTerms) {
        items.push({
          label: '출품자 전시위탁 계약서',
          reason: '문서 하단까지 스크롤해주세요.',
          targetId: 'exhibitor-consent-section',
        });
      } else if (!exhibitorAgreed) {
        items.push({
          label: '출품자 전시위탁 계약서',
          reason: '동의 체크박스를 선택해주세요.',
          targetId: 'exhibitor-consent-section',
        });
      }
    }

    if (needsPrivacyConsent && !privacyAgreed) {
      items.push({
        label: '개인정보처리방침',
        reason: '동의 체크박스를 선택해주세요.',
        targetId: 'privacy-consent-section',
      });
    }

    if (needsTosConsent && !tosAgreed) {
      items.push({
        label: '이용약관',
        reason: '동의 체크박스를 선택해주세요.',
        targetId: 'tos-consent-section',
      });
    }

    return items;
  }, [
    artistAgreed,
    exhibitorAgreed,
    hasReadArtistTerms,
    hasReadExhibitorTerms,
    needsArtistConsent,
    needsExhibitorConsent,
    needsPrivacyConsent,
    needsTosConsent,
    privacyAgreed,
    tosAgreed,
  ]);

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

    const targetId = item.targetId;

    // 모달 언마운트 + body overflow 복원 후 스크롤
    setTimeout(() => {
      const section = document.getElementById(targetId);
      if (!section) return;

      // 계약서 내부 스크롤을 맨 위로 리셋
      const scrollContainer = section.querySelector<HTMLElement>('[role="region"]');
      if (scrollContainer) scrollContainer.scrollTop = 0;

      section.scrollIntoView({ behavior: 'smooth', block: 'start' });

      window.requestAnimationFrame(() => {
        // 스크롤 컨테이너([role="region"])는 focus 대상에서 제외
        // — focus 시 브라우저가 자동 스크롤하여 내용이 빈 공간으로 밀림
        const focusTarget =
          section.querySelector<HTMLElement>('input[type="checkbox"]:not([disabled])') ??
          section.querySelector<HTMLElement>(
            'input:not([type="hidden"]):not([disabled]), textarea:not([disabled])'
          );
        if (focusTarget) {
          focusTarget.focus({ preventScroll: true });
        }
        // 안전장치: focus 후에도 내부 스크롤 리셋
        if (scrollContainer) scrollContainer.scrollTop = 0;
      });
    }, 100);
  };

  const handleSubmitAttempt = (event: React.FormEvent<HTMLFormElement>) => {
    if (isPending || canSubmit) return;
    event.preventDefault();
    submitTriggerRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsIncompleteModalOpen(true);
  };

  const handleArtistTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadArtistTerms) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadArtistTerms(true);
    }
  };

  const handleExhibitorTermsScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadExhibitorTerms) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadExhibitorTerms(true);
    }
  };

  useEffect(() => {
    const checkScrollableState = () => {
      if (
        artistTermsContainerRef.current &&
        artistTermsContainerRef.current.scrollHeight <=
          artistTermsContainerRef.current.clientHeight + 1
      ) {
        setHasReadArtistTerms(true);
      }

      if (
        exhibitorTermsContainerRef.current &&
        exhibitorTermsContainerRef.current.scrollHeight <=
          exhibitorTermsContainerRef.current.clientHeight + 1
      ) {
        setHasReadExhibitorTerms(true);
      }
    };

    checkScrollableState();
    window.addEventListener('resize', checkScrollableState);
    return () => window.removeEventListener('resize', checkScrollableState);
  }, []);

  return (
    <form action={formAction} className="space-y-5" onSubmit={handleSubmitAttempt}>
      <input type="hidden" name="next_path" value={nextPath} />
      <input
        type="hidden"
        name="artist_terms_read_complete"
        value={hasReadArtistTerms ? '1' : '0'}
      />
      <input
        type="hidden"
        name="exhibitor_terms_read_complete"
        value={hasReadExhibitorTerms ? '1' : '0'}
      />
      <input type="hidden" name="artist_terms_version" value={ARTIST_APPLICATION_TERMS_VERSION} />
      <input
        type="hidden"
        name="exhibitor_terms_version"
        value={EXHIBITOR_APPLICATION_TERMS_VERSION}
      />
      <input type="hidden" name="privacy_version" value={PRIVACY_POLICY_VERSION} />
      <input type="hidden" name="tos_version" value={TERMS_OF_SERVICE_VERSION} />

      {needsArtistConsent && (
        <div
          id="artist-consent-section"
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p id="artist-terms-heading" className="mb-2 text-xs font-semibold text-gray-700">
            전시·판매위탁 계약서 전문
          </p>
          <div
            ref={artistTermsContainerRef}
            className="mb-3 max-h-[60vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[70vh]"
            onScroll={handleArtistTermsScroll}
            tabIndex={0}
            role="region"
            aria-labelledby="artist-terms-heading"
          >
            <LegalDocumentContent document={ARTIST_APPLICATION_TERMS_DOCUMENT} />
          </div>
          {!hasReadArtistTerms && (
            <p className="mb-3 text-xs text-amber-700">문서 하단까지 스크롤해주세요.</p>
          )}

          <div className="flex items-start gap-3">
            <input
              id="agree_artist"
              name="agree_artist"
              type="checkbox"
              checked={artistAgreed}
              onChange={(event) => setArtistAgreed(event.target.checked)}
              disabled={!hasReadArtistTerms}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_artist" className="font-medium text-gray-700">
                전시·판매위탁 계약서에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-gray-500">전체 문서를 읽어야 체크할 수 있습니다.</p>
              <p className="mt-1 text-xs text-gray-400">
                <Link href="/terms/artist" className="underline underline-offset-2">
                  계약서 원문 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {needsExhibitorConsent && (
        <div
          id="exhibitor-consent-section"
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p id="exhibitor-terms-heading" className="mb-2 text-xs font-semibold text-gray-700">
            출품자 전시위탁 계약서 전문
          </p>
          <div
            ref={exhibitorTermsContainerRef}
            className="mb-3 max-h-[60vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[70vh]"
            onScroll={handleExhibitorTermsScroll}
            tabIndex={0}
            role="region"
            aria-labelledby="exhibitor-terms-heading"
          >
            <LegalDocumentContent document={EXHIBITOR_APPLICATION_TERMS_DOCUMENT} />
          </div>
          {!hasReadExhibitorTerms && (
            <p className="mb-3 text-xs text-amber-700">문서 하단까지 스크롤해주세요.</p>
          )}

          <div className="flex items-start gap-3">
            <input
              id="agree_exhibitor"
              name="agree_exhibitor"
              type="checkbox"
              checked={exhibitorAgreed}
              onChange={(event) => setExhibitorAgreed(event.target.checked)}
              disabled={!hasReadExhibitorTerms}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_exhibitor" className="font-medium text-gray-700">
                출품자 전시위탁 계약서에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-gray-500">전체 문서를 읽어야 체크할 수 있습니다.</p>
              <p className="mt-1 text-xs text-gray-400">
                <Link href="/terms/exhibitor" className="underline underline-offset-2">
                  계약서 원문 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {needsPrivacyConsent ? (
        <div
          id="privacy-consent-section"
          className="rounded-lg border border-gray-200 bg-gray-50 p-4"
        >
          <p id="privacy-heading" className="mb-2 text-xs font-semibold text-gray-700">
            개인정보처리방침 전문
          </p>
          <div
            className="mb-3 max-h-[60vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[70vh]"
            tabIndex={0}
            role="region"
            aria-labelledby="privacy-heading"
          >
            <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="agree_privacy"
              name="agree_privacy"
              type="checkbox"
              checked={privacyAgreed}
              onChange={(event) => setPrivacyAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_privacy" className="font-medium text-gray-700">
                개인정보처리방침에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-xs text-gray-400">
                <Link href="/privacy" className="underline underline-offset-2">
                  개인정보처리방침 원문 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <p className="text-xs font-semibold text-gray-700">개인정보처리방침</p>
          <p className="mt-1 text-xs text-gray-500">
            아래 링크에서 개인정보처리방침 전문을 확인하실 수 있습니다.
          </p>
          <p className="mt-2 text-xs text-gray-400">
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              개인정보처리방침 전문 보기 (새 창)
            </Link>
          </p>
        </div>
      )}

      {needsTosConsent && (
        <div id="tos-consent-section" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p id="tos-heading" className="mb-2 text-xs font-semibold text-gray-700">
            이용약관 전문
          </p>
          <div
            className="mb-3 max-h-[60vh] overflow-y-auto rounded-md border border-gray-200 bg-white p-3 md:max-h-[70vh]"
            tabIndex={0}
            role="region"
            aria-labelledby="tos-heading"
          >
            <LegalDocumentContent document={TERMS_OF_SERVICE_DOCUMENT} />
          </div>

          <div className="flex items-start gap-3">
            <input
              id="agree_tos"
              name="agree_tos"
              type="checkbox"
              checked={tosAgreed}
              onChange={(event) => setTosAgreed(event.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-black"
            />
            <div className="text-sm">
              <label htmlFor="agree_tos" className="font-medium text-gray-700">
                이용약관에 동의합니다. <span className="text-red-500">*</span>
              </label>
              <p className="mt-1 text-xs text-gray-400">
                <Link href="/terms" className="underline underline-offset-2">
                  이용약관 원문 보기
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-4">
        {state.error && <p className="text-sm text-red-600">{state.message}</p>}
        <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
          동의하고 계속하기
        </Button>
      </div>
      <IncompleteItemsModal
        isOpen={isIncompleteModalOpen}
        onClose={handleCloseIncompleteModal}
        title="아직 완료되지 않은 항목이 있어요"
        description="아래 항목을 완료하면 계속 진행할 수 있습니다."
        items={incompleteItems}
        onSelectItem={handleSelectIncompleteItem}
      />
    </form>
  );
}
