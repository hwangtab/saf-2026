'use client';

import Link from 'next/link';
import { type RefObject, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import { useLocale } from 'next-intl';
import { ChevronDown } from 'lucide-react';
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

const TERMS_CONSENT_COPY: Record<
  'ko' | 'en',
  {
    artistContract: string;
    exhibitorContract: string;
    privacyPolicy: string;
    tos: string;
    scrollToBottom: string;
    checkAgreement: string;
    scrollPrompt: string;
    scrollHint: string;
    agreeArtist: string;
    agreeExhibitor: string;
    agreePrivacy: string;
    agreeTos: string;
    readRequired: string;
    readGuide: string;
    viewArtistContract: string;
    viewExhibitorContract: string;
    viewPrivacy: string;
    viewTos: string;
    privacyLinkGuide: string;
    privacyOpenNew: string;
    continueAfterConsent: string;
    incompleteTitle: string;
    incompleteDescription: string;
  }
> = {
  ko: {
    artistContract: '전시·판매위탁 계약서',
    exhibitorContract: '출품자 전시위탁 계약서',
    privacyPolicy: '개인정보처리방침',
    tos: '이용약관',
    scrollToBottom: '문서 하단까지 스크롤해주세요.',
    checkAgreement: '동의 체크박스를 선택해주세요.',
    scrollPrompt: '아래로 스크롤하세요 ↓',
    scrollHint: '문서 하단까지 스크롤하면 동의 항목이 활성화됩니다.',
    agreeArtist: '전시·판매위탁 계약서에 동의합니다.',
    agreeExhibitor: '출품자 전시위탁 계약서에 동의합니다.',
    agreePrivacy: '개인정보처리방침에 동의합니다.',
    agreeTos: '이용약관에 동의합니다.',
    readRequired: '전체 문서를 읽어야 체크할 수 있습니다.',
    readGuide: '위 문서를 끝까지 스크롤해주세요.',
    viewArtistContract: '계약서 원문 보기',
    viewExhibitorContract: '계약서 원문 보기',
    viewPrivacy: '개인정보처리방침 원문 보기',
    viewTos: '이용약관 원문 보기',
    privacyLinkGuide: '아래 링크에서 개인정보처리방침 전문을 확인하실 수 있습니다.',
    privacyOpenNew: '개인정보처리방침 전문 보기 (새 창)',
    continueAfterConsent: '동의하고 계속하기',
    incompleteTitle: '아직 완료되지 않은 항목이 있어요',
    incompleteDescription: '아래 항목을 완료하면 계속 진행할 수 있습니다.',
  },
  en: {
    artistContract: 'Exhibition and sales consignment agreement',
    exhibitorContract: 'Exhibitor consignment agreement',
    privacyPolicy: 'Privacy policy',
    tos: 'Terms of service',
    scrollToBottom: 'Please scroll to the bottom of the document.',
    checkAgreement: 'Please check the consent box.',
    scrollPrompt: 'Scroll down ↓',
    scrollHint: 'Consent options become active after you scroll to the bottom.',
    agreeArtist: 'I agree to the exhibition and sales consignment agreement.',
    agreeExhibitor: 'I agree to the exhibitor consignment agreement.',
    agreePrivacy: 'I agree to the privacy policy.',
    agreeTos: 'I agree to the terms of service.',
    readRequired: 'You can check this box after reading the full document.',
    readGuide: 'Please scroll through the document above to continue.',
    viewArtistContract: 'View original agreement',
    viewExhibitorContract: 'View original agreement',
    viewPrivacy: 'View original privacy policy',
    viewTos: 'View original terms of service',
    privacyLinkGuide: 'You can review the full privacy policy at the link below.',
    privacyOpenNew: 'Open full privacy policy (new window)',
    continueAfterConsent: 'Agree and continue',
    incompleteTitle: 'Some required items are incomplete',
    incompleteDescription: 'Complete the items below to continue.',
  },
};

export function TermsConsentForm({
  nextPath,
  needsArtistConsent,
  needsExhibitorConsent,
  needsPrivacyConsent,
  needsTosConsent,
}: TermsConsentFormProps) {
  const locale = useLocale();
  const copy = TERMS_CONSENT_COPY[locale as 'ko' | 'en'];
  const [state, formAction, isPending] = useActionState(submitTermsConsent, initialState);
  const [hasReadArtistTerms, setHasReadArtistTerms] = useState(false);
  const [hasReadExhibitorTerms, setHasReadExhibitorTerms] = useState(false);
  const [hasReadPrivacy, setHasReadPrivacy] = useState(false);
  const [hasReadTos, setHasReadTos] = useState(false);
  const [artistAgreed, setArtistAgreed] = useState(false);
  const [exhibitorAgreed, setExhibitorAgreed] = useState(false);
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [tosAgreed, setTosAgreed] = useState(false);
  const [isIncompleteModalOpen, setIsIncompleteModalOpen] = useState(false);
  const artistTermsContainerRef = useRef<HTMLDivElement>(null);
  const exhibitorTermsContainerRef = useRef<HTMLDivElement>(null);
  const privacyContainerRef = useRef<HTMLDivElement>(null);
  const tosContainerRef = useRef<HTMLDivElement>(null);
  const submitTriggerRef = useRef<HTMLElement | null>(null);
  const errorRegionRef = useRef<HTMLDivElement | null>(null);

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
          label: copy.artistContract,
          reason: copy.scrollToBottom,
          targetId: 'artist-consent-section',
        });
      } else if (!artistAgreed) {
        items.push({
          label: copy.artistContract,
          reason: copy.checkAgreement,
          targetId: 'artist-consent-section',
        });
      }
    }

    if (needsExhibitorConsent) {
      if (!hasReadExhibitorTerms) {
        items.push({
          label: copy.exhibitorContract,
          reason: copy.scrollToBottom,
          targetId: 'exhibitor-consent-section',
        });
      } else if (!exhibitorAgreed) {
        items.push({
          label: copy.exhibitorContract,
          reason: copy.checkAgreement,
          targetId: 'exhibitor-consent-section',
        });
      }
    }

    if (needsPrivacyConsent) {
      if (!hasReadPrivacy) {
        items.push({
          label: copy.privacyPolicy,
          reason: copy.scrollToBottom,
          targetId: 'privacy-consent-section',
        });
      } else if (!privacyAgreed) {
        items.push({
          label: copy.privacyPolicy,
          reason: copy.checkAgreement,
          targetId: 'privacy-consent-section',
        });
      }
    }

    if (needsTosConsent) {
      if (!hasReadTos) {
        items.push({
          label: copy.tos,
          reason: copy.scrollToBottom,
          targetId: 'tos-consent-section',
        });
      } else if (!tosAgreed) {
        items.push({
          label: copy.tos,
          reason: copy.checkAgreement,
          targetId: 'tos-consent-section',
        });
      }
    }

    return items;
  }, [
    artistAgreed,
    exhibitorAgreed,
    hasReadArtistTerms,
    hasReadExhibitorTerms,
    hasReadPrivacy,
    hasReadTos,
    needsArtistConsent,
    needsExhibitorConsent,
    needsPrivacyConsent,
    needsTosConsent,
    privacyAgreed,
    tosAgreed,
    copy.artistContract,
    copy.checkAgreement,
    copy.exhibitorContract,
    copy.privacyPolicy,
    copy.scrollToBottom,
    copy.tos,
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

  const nudgeScroll = (containerRef: RefObject<HTMLDivElement | null>) => {
    containerRef.current?.scrollBy({ top: 80, behavior: 'smooth' });
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

  const handlePrivacyScroll = (event: React.UIEvent<HTMLDivElement>) => {
    if (hasReadPrivacy) return;
    const target = event.currentTarget;
    const reachedBottom = target.scrollTop + target.clientHeight >= target.scrollHeight - 12;
    if (reachedBottom) {
      setHasReadPrivacy(true);
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

  // 서버 액션이 에러 state를 반환하면(특히 silent RLS 실패), 사용자가 메시지를 놓치지 않도록 alert 박스를 화면 가운데로 스크롤.
  useEffect(() => {
    if (state.error && state.message && errorRegionRef.current) {
      errorRegionRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [state.error, state.message]);

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

      if (
        privacyContainerRef.current &&
        privacyContainerRef.current.scrollHeight <= privacyContainerRef.current.clientHeight + 1
      ) {
        setHasReadPrivacy(true);
      }

      if (
        tosContainerRef.current &&
        tosContainerRef.current.scrollHeight <= tosContainerRef.current.clientHeight + 1
      ) {
        setHasReadTos(true);
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
          <p id="artist-terms-heading" className="mb-2 text-xs font-semibold text-charcoal">
            {copy.artistContract}
          </p>
          <div className="relative">
            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
            <div
              ref={artistTermsContainerRef}
              className="mb-3 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[70vh]"
              onScroll={handleArtistTermsScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="artist-terms-heading"
            >
              <LegalDocumentContent document={ARTIST_APPLICATION_TERMS_DOCUMENT} />
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            {!hasReadArtistTerms && (
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex flex-col items-center">
                <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                  {copy.scrollPrompt}
                </span>
              </div>
            )}
          </div>
          {!hasReadArtistTerms && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
              <p className="text-xs font-medium text-primary-strong">{copy.scrollHint}</p>
            </div>
          )}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 미읽음 상태에서만 role="button"+onClick 활성화; 내부 checkbox가 키보드 접근성 담당 */}
          <div
            className="flex items-start gap-3"
            onClick={!hasReadArtistTerms ? () => nudgeScroll(artistTermsContainerRef) : undefined}
            role={!hasReadArtistTerms ? 'button' : undefined}
            tabIndex={!hasReadArtistTerms ? 0 : undefined}
          >
            <input
              id="agree_artist"
              name="agree_artist"
              type="checkbox"
              checked={artistAgreed}
              onChange={(event) => setArtistAgreed(event.target.checked)}
              disabled={!hasReadArtistTerms}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus-visible:ring-primary"
            />
            <div className="text-sm">
              <label htmlFor="agree_artist" className="font-medium text-charcoal">
                {copy.agreeArtist} <span className="text-danger">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                {hasReadArtistTerms ? copy.readGuide : copy.readRequired}
              </p>
              <p className="mt-1 text-xs text-charcoal-soft">
                <Link href="/terms/artist" className="underline underline-offset-2">
                  {copy.viewArtistContract}
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
          <p id="exhibitor-terms-heading" className="mb-2 text-xs font-semibold text-charcoal">
            {copy.exhibitorContract}
          </p>
          <div className="relative">
            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
            <div
              ref={exhibitorTermsContainerRef}
              className="mb-3 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[70vh]"
              onScroll={handleExhibitorTermsScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="exhibitor-terms-heading"
            >
              <LegalDocumentContent document={EXHIBITOR_APPLICATION_TERMS_DOCUMENT} />
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            {!hasReadExhibitorTerms && (
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex flex-col items-center">
                <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                  {copy.scrollPrompt}
                </span>
              </div>
            )}
          </div>
          {!hasReadExhibitorTerms && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
              <p className="text-xs font-medium text-primary-strong">{copy.scrollHint}</p>
            </div>
          )}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 미읽음 상태에서만 role="button"+onClick 활성화; 내부 checkbox가 키보드 접근성 담당 */}
          <div
            className="flex items-start gap-3"
            onClick={
              !hasReadExhibitorTerms ? () => nudgeScroll(exhibitorTermsContainerRef) : undefined
            }
            role={!hasReadExhibitorTerms ? 'button' : undefined}
            tabIndex={!hasReadExhibitorTerms ? 0 : undefined}
          >
            <input
              id="agree_exhibitor"
              name="agree_exhibitor"
              type="checkbox"
              checked={exhibitorAgreed}
              onChange={(event) => setExhibitorAgreed(event.target.checked)}
              disabled={!hasReadExhibitorTerms}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus-visible:ring-primary"
            />
            <div className="text-sm">
              <label htmlFor="agree_exhibitor" className="font-medium text-charcoal">
                {copy.agreeExhibitor} <span className="text-danger">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                {hasReadExhibitorTerms ? copy.readGuide : copy.readRequired}
              </p>
              <p className="mt-1 text-xs text-charcoal-soft">
                <Link href="/terms/exhibitor" className="underline underline-offset-2">
                  {copy.viewExhibitorContract}
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
          <p id="privacy-heading" className="mb-2 text-xs font-semibold text-charcoal">
            {copy.privacyPolicy}
          </p>
          <div className="relative">
            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
            <div
              ref={privacyContainerRef}
              className="mb-3 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[70vh]"
              onScroll={handlePrivacyScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="privacy-heading"
            >
              <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            {!hasReadPrivacy && (
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex flex-col items-center">
                <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                  {copy.scrollPrompt}
                </span>
              </div>
            )}
          </div>
          {!hasReadPrivacy && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
              <p className="text-xs font-medium text-primary-strong">{copy.scrollHint}</p>
            </div>
          )}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 미읽음 상태에서만 role="button"+onClick 활성화; 내부 checkbox가 키보드 접근성 담당 */}
          <div
            className="flex items-start gap-3"
            onClick={!hasReadPrivacy ? () => nudgeScroll(privacyContainerRef) : undefined}
            role={!hasReadPrivacy ? 'button' : undefined}
            tabIndex={!hasReadPrivacy ? 0 : undefined}
          >
            <input
              id="agree_privacy"
              name="agree_privacy"
              type="checkbox"
              checked={privacyAgreed}
              onChange={(event) => setPrivacyAgreed(event.target.checked)}
              disabled={!hasReadPrivacy}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus-visible:ring-primary"
            />
            <div className="text-sm">
              <label htmlFor="agree_privacy" className="font-medium text-charcoal">
                {copy.agreePrivacy} <span className="text-danger">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                {hasReadPrivacy ? copy.readGuide : copy.readRequired}
              </p>
              <p className="mt-1 text-xs text-charcoal-soft">
                <Link href="/privacy" className="underline underline-offset-2">
                  {copy.viewPrivacy}
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
          <p className="text-xs font-semibold text-charcoal">{copy.privacyPolicy}</p>
          <p className="mt-1 text-xs text-gray-500">{copy.privacyLinkGuide}</p>
          <p className="mt-2 text-xs text-charcoal-soft">
            <Link
              href="/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {copy.privacyOpenNew}
            </Link>
          </p>
        </div>
      )}

      {needsTosConsent && (
        <div id="tos-consent-section" className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <p id="tos-heading" className="mb-2 text-xs font-semibold text-charcoal">
            {copy.tos}
          </p>
          <div className="relative">
            {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
            <div
              ref={tosContainerRef}
              className="mb-3 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[70vh]"
              onScroll={handleTosScroll}
              tabIndex={0}
              role="region"
              aria-labelledby="tos-heading"
            >
              <LegalDocumentContent document={TERMS_OF_SERVICE_DOCUMENT} />
            </div>
            {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
            {!hasReadTos && (
              <div className="pointer-events-none absolute bottom-3 left-0 right-0 flex flex-col items-center">
                <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                  {copy.scrollPrompt}
                </span>
              </div>
            )}
          </div>
          {!hasReadTos && (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
              <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
              <p className="text-xs font-medium text-primary-strong">{copy.scrollHint}</p>
            </div>
          )}

          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 미읽음 상태에서만 role="button"+onClick 활성화; 내부 checkbox가 키보드 접근성 담당 */}
          <div
            className="flex items-start gap-3"
            onClick={!hasReadTos ? () => nudgeScroll(tosContainerRef) : undefined}
            role={!hasReadTos ? 'button' : undefined}
            tabIndex={!hasReadTos ? 0 : undefined}
          >
            <input
              id="agree_tos"
              name="agree_tos"
              type="checkbox"
              checked={tosAgreed}
              onChange={(event) => setTosAgreed(event.target.checked)}
              disabled={!hasReadTos}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus-visible:ring-primary"
            />
            <div className="text-sm">
              <label htmlFor="agree_tos" className="font-medium text-charcoal">
                {copy.agreeTos} <span className="text-danger">*</span>
              </label>
              <p className="mt-1 text-gray-500">
                {hasReadTos ? copy.readGuide : copy.readRequired}
              </p>
              <p className="mt-1 text-xs text-charcoal-soft">
                <Link href="/terms" className="underline underline-offset-2">
                  {copy.viewTos}
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {state.error && state.message && (
        <div
          ref={errorRegionRef}
          role="alert"
          className="rounded-lg border border-danger bg-danger/10 px-4 py-3 text-sm text-danger-a11y"
        >
          {state.message}
        </div>
      )}

      <div className="flex justify-end border-t border-gray-100 pt-4">
        <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
          {copy.continueAfterConsent}
        </Button>
      </div>
      <IncompleteItemsModal
        isOpen={isIncompleteModalOpen}
        onClose={handleCloseIncompleteModal}
        title={copy.incompleteTitle}
        description={copy.incompleteDescription}
        items={incompleteItems}
        onSelectItem={handleSelectIncompleteItem}
      />
    </form>
  );
}
