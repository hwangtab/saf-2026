'use client';

import { type RefObject, useActionState, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { ChevronDown } from 'lucide-react';
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
  const locale = useLocale();
  const t = useTranslations('onboardingForm');
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
  const actionMessage =
    locale === 'en' && state.message && /[가-힣]/.test(state.message)
      ? t('genericSubmitError')
      : state.message;
  const incompleteItems = useMemo(() => {
    const items: IncompleteItem[] = [];

    if (!hasReadTerms) {
      items.push({
        label: t('contractLabel'),
        reason: t('readToBottom'),
        targetId: 'artist-contract-section',
      });
    }

    if (!hasReadTos) {
      items.push({
        label: t('tosLabel'),
        reason: t('readToBottom'),
        targetId: 'artist-tos-section',
      });
    }

    if (!hasReadPrivacy) {
      items.push({
        label: t('privacyLabel'),
        reason: t('readToBottom'),
        targetId: 'artist-privacy-section',
      });
    }

    if (allRead && !termsAccepted) {
      items.push({
        label: t('agreementLabel'),
        reason: t('checkAgreement'),
        targetId: 'artist-agreement-section',
      });
    }

    return items;
  }, [allRead, t, hasReadPrivacy, hasReadTerms, hasReadTos, termsAccepted]);

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

  // Return ref of first unread document
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
        <label htmlFor="artist_name" className="block text-sm font-medium text-charcoal">
          {t('artistName')} <span className="text-danger">*</span>
        </label>
        <div className="mt-1">
          <input
            id="artist_name"
            name="artist_name"
            type="text"
            required
            defaultValue={defaultValues?.artist_name || ''}
            className="shadow-sm focus-visible:ring-primary focus-visible:border-primary block w-full sm:text-sm border-gray-300 rounded-lg"
            placeholder={t('artistNamePlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="contact" className="block text-sm font-medium text-charcoal">
          {t('contact')} <span className="text-danger">*</span>
        </label>
        <div className="mt-1">
          <input
            id="contact"
            name="contact"
            type="text"
            required
            defaultValue={defaultValues?.contact || ''}
            className="shadow-sm focus-visible:ring-primary focus-visible:border-primary block w-full sm:text-sm border-gray-300 rounded-lg"
            placeholder={t('contactPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="bio" className="block text-sm font-medium text-charcoal">
          {t('bio')} <span className="text-danger">*</span>
        </label>
        <div className="mt-1">
          <textarea
            id="bio"
            name="bio"
            rows={5}
            required
            defaultValue={defaultValues?.bio || ''}
            className="shadow-sm focus-visible:ring-primary focus-visible:border-primary block w-full sm:text-sm border-gray-300 rounded-lg"
            placeholder={t('bioPlaceholder')}
          />
        </div>
      </div>

      <div>
        <label htmlFor="referrer" className="block text-sm font-medium text-charcoal">
          {t('referrer')} <span className="text-charcoal-soft font-normal">{t('optional')}</span>
        </label>
        <div className="mt-1">
          <input
            id="referrer"
            name="referrer"
            type="text"
            defaultValue={defaultValues?.referrer || ''}
            className="shadow-sm focus-visible:ring-primary focus-visible:border-primary block w-full sm:text-sm border-gray-300 rounded-lg"
            placeholder={t('referrerPlaceholder')}
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
            <p id="artist-terms-heading" className="mb-2 text-xs font-semibold text-charcoal">
              {t('contractFull')}
            </p>
            <div className="relative">
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
              <div
                ref={termsContainerRef}
                className="max-h-[52vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[65vh]"
                onScroll={handleTermsScroll}
                tabIndex={0}
                role="region"
                aria-labelledby="artist-terms-heading"
              >
                <LegalDocumentContent document={ARTIST_APPLICATION_TERMS_DOCUMENT} />
              </div>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
              {!hasReadTerms && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    {t('scrollDown')}
                  </span>
                </div>
              )}
            </div>
            {!hasReadTerms && (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
                <p className="text-xs font-medium text-primary-strong">{t('scrollHint')}</p>
              </div>
            )}
          </div>

          <div id="artist-tos-section">
            <p id="tos-heading" className="mb-2 text-xs font-semibold text-charcoal">
              {t('tosFull')}
            </p>
            <div className="relative">
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
              <div
                ref={tosContainerRef}
                className="max-h-[52vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[65vh]"
                onScroll={handleTosScroll}
                tabIndex={0}
                role="region"
                aria-labelledby="tos-heading"
              >
                <LegalDocumentContent document={TERMS_OF_SERVICE_DOCUMENT} />
              </div>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
              {!hasReadTos && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    {t('scrollDown')}
                  </span>
                </div>
              )}
            </div>
            {!hasReadTos && (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
                <p className="text-xs font-medium text-primary-strong">{t('scrollHint')}</p>
              </div>
            )}
          </div>

          <div id="artist-privacy-section">
            <p id="privacy-policy-heading" className="mb-2 text-xs font-semibold text-charcoal">
              {t('privacyFull')}
            </p>
            <div className="relative">
              {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- 키보드 스크롤 접근성을 위해 region에 tabIndex 필요 */}
              <div
                ref={privacyContainerRef}
                className="max-h-[52vh] overflow-y-auto rounded-lg border border-gray-200 bg-white p-3 md:max-h-[65vh]"
                onScroll={handlePrivacyScroll}
                tabIndex={0}
                role="region"
                aria-labelledby="privacy-policy-heading"
              >
                <LegalDocumentContent document={PRIVACY_POLICY_DOCUMENT} />
              </div>
              {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
              {!hasReadPrivacy && (
                <div className="pointer-events-none absolute bottom-0 left-0 right-0 flex flex-col items-center">
                  <div className="absolute inset-x-0 bottom-0 h-16 rounded-b-md bg-gradient-to-t from-white via-white/80 to-transparent" />
                  <span className="relative animate-bounce rounded-full bg-gray-900 px-3 py-1 text-xs font-medium text-white shadow">
                    {t('scrollDown')}
                  </span>
                </div>
              )}
            </div>
            {!hasReadPrivacy && (
              <div className="mt-1 flex items-center gap-2 rounded-lg border border-primary-soft bg-primary-surface px-3 py-2">
                <ChevronDown aria-hidden="true" className="h-4 w-4 text-primary-strong" />
                <p className="text-xs font-medium text-primary-strong">{t('scrollHint')}</p>
              </div>
            )}
          </div>
        </div>

        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events -- 미읽음 상태에서만 role="button"+onClick 활성화; 내부 checkbox가 키보드 접근성 담당 */}
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
            className="mt-1 h-4 w-4 rounded border-gray-300 text-black focus:ring-primary"
          />
          <div className="text-sm">
            <label htmlFor="terms_accepted" className="font-medium text-charcoal">
              {t('agreeAll')} <span className="text-danger">*</span>
            </label>
            <p className="mt-1 text-gray-500">
              {allRead ? t('allReadGuide') : t('needScrollGuide')}
            </p>
            <p className="mt-1 text-xs text-charcoal-soft">
              {t('originalLinks')}{' '}
              <Link href="/terms/artist" className="underline underline-offset-2">
                {t('contractLink')}
              </Link>{' '}
              /{' '}
              <Link href="/terms" className="underline underline-offset-2">
                {t('tosLink')}
              </Link>{' '}
              /{' '}
              <Link href="/privacy" className="underline underline-offset-2">
                {t('privacyLink')}
              </Link>
            </p>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-gray-200">
        <div className="flex justify-end items-center gap-4">
          {state.error && actionMessage && <p className="text-danger text-sm">{actionMessage}</p>}
          {state.message && !state.error && (
            <p className="text-success-a11y text-sm flex items-center gap-1">
              <CheckMarkIcon />
              {t('submitted')}
            </p>
          )}
          <Button type="submit" loading={isPending} disabled={isPending} variant="secondary">
            {t('submit')}
          </Button>
        </div>
      </div>
      <IncompleteItemsModal
        isOpen={isIncompleteModalOpen}
        onClose={handleCloseIncompleteModal}
        title={t('incompleteTitle')}
        description={t('incompleteDescription')}
        items={incompleteItems}
        onSelectItem={handleSelectIncompleteItem}
      />
    </form>
  );
}
