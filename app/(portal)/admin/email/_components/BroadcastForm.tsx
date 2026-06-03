'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  enqueueBroadcast,
  enqueueIndividualBroadcast,
  sendTestEmail,
} from '@/app/actions/admin-broadcast';
import { TemplatePicker } from './TemplatePicker';
import { AudienceSelector, type SegmentSelection } from './AudienceSelector';
import { ContactSearch, type SelectedContact } from './ContactSearch';
import type { BroadcastTemplate } from '@/lib/email/templates';

type Mode = 'segment' | 'search';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DEFAULT_SEGMENT: SegmentSelection = {
  channel: 'member',
  subset: 'all',
  petitionSlug: '',
  artworkId: '',
  isArtworkBuyer: false,
  advertising: false,
};

export function BroadcastForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isTestPending, startTestTransition] = useTransition();

  const [mode, setMode] = useState<Mode>('segment');

  // form fields
  const [subject, setSubject] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // segment audience state
  const [segment, setSegment] = useState<SegmentSelection>(DEFAULT_SEGMENT);

  // search-mode state
  const [selectedContacts, setSelectedContacts] = useState<SelectedContact[]>([]);
  const [searchAdvertising, setSearchAdvertising] = useState(false);
  const [manualEmails, setManualEmails] = useState('');

  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 8;
  const manualSummary = (() => {
    const tokens = manualEmails
      .split(/[\s,;]+/)
      .map((token) => token.toLowerCase().trim())
      .filter(Boolean);
    const seen = new Set<string>();
    let valid = 0;
    let invalid = 0;
    let duplicate = 0;
    let alreadySelected = 0;

    for (const token of tokens) {
      if (!EMAIL_RE.test(token)) {
        invalid += 1;
        continue;
      }
      if (seen.has(token)) {
        duplicate += 1;
        continue;
      }
      seen.add(token);
      if (selectedContacts.some((contact) => contact.email.toLowerCase() === token)) {
        alreadySelected += 1;
        continue;
      }
      valid += 1;
    }

    return { tokens, valid, invalid, duplicate, alreadySelected };
  })();
  const submitBlockReason = (() => {
    if (mode === 'search' && manualSummary.valid > 0) {
      return '입력 중인 이메일이 아직 추가되지 않았습니다. 입력한 이메일 추가 버튼을 눌러주세요.';
    }
    if (mode === 'search' && selectedContacts.length === 0) {
      return '받는 사람을 1명 이상 추가해주세요.';
    }
    if (mode === 'segment' && segment.channel === 'petition' && !segment.petitionSlug) {
      return '청원 캠페인 알림은 청원을 먼저 선택해야 합니다.';
    }
    if (mode === 'segment' && segment.isArtworkBuyer && !segment.artworkId.trim()) {
      return '특정 작품 구매자는 작품을 먼저 선택해야 합니다.';
    }
    return null;
  })();
  const submitDisabled = isPending || Boolean(submitBlockReason);
  const addManualRecipients = () => {
    const existingEmails = new Set(selectedContacts.map((contact) => contact.email.toLowerCase()));
    const nextRecipients: SelectedContact[] = [];
    const seen = new Set<string>();

    for (const token of manualSummary.tokens) {
      if (!EMAIL_RE.test(token) || seen.has(token) || existingEmails.has(token)) continue;
      seen.add(token);
      nextRecipients.push({ email: token, name: null });
    }

    if (nextRecipients.length === 0) return;
    setSelectedContacts([...selectedContacts, ...nextRecipients]);
    setManualEmails('');
  };

  const applyTemplate = (t: BroadcastTemplate) => {
    setSubject(t.subject);
    setBodyMd(t.bodyMd);
    setCtaLabel(t.ctaLabel ?? '');
    setCtaUrl(t.ctaUrl ?? '');
    if (t.channel === 'individual') {
      setSearchAdvertising(t.isAdvertisement);
      setMode('search');
    } else {
      setSegment((s) => ({
        ...s,
        advertising: t.isAdvertisement,
        ...(t.channel === 'customer' ? { channel: 'customer', isArtworkBuyer: false } : {}),
        ...(t.channel === 'member' || t.channel === 'petition'
          ? { channel: t.channel, isArtworkBuyer: false }
          : {}),
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (submitBlockReason) {
      setError(submitBlockReason);
      return;
    }
    if (!confirmed) {
      setError('발송 확인 체크박스를 선택해주세요.');
      return;
    }
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      if (mode === 'search') {
        const result = await enqueueIndividualBroadcast({
          recipients: selectedContacts,
          subject,
          bodyMd,
          ctaLabel: ctaLabel || undefined,
          ctaUrl: ctaUrl || undefined,
          isAdvertisement: searchAdvertising,
        });
        if (result.error) {
          setError(result.message);
        } else {
          setSuccess(result.message);
          setSubject('');
          setBodyMd('');
          setCtaLabel('');
          setCtaUrl('');
          setSelectedContacts([]);
          setManualEmails('');
          setConfirmed(false);
          router.refresh();
        }
        return;
      }

      // segment mode
      const result = await enqueueBroadcast({
        channel: segment.channel,
        subject,
        bodyMd,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        petitionSlug: segment.channel === 'petition' ? segment.petitionSlug : undefined,
        audienceFilter: {
          subset: segment.subset,
          ...(segment.isArtworkBuyer
            ? { artworkId: segment.artworkId, mode: 'artwork-buyer' }
            : {}),
        },
        isAdvertisement: segment.advertising,
      });

      if (result.error) {
        setError(result.message);
      } else {
        setSuccess(result.message);
        setSubject('');
        setBodyMd('');
        setCtaLabel('');
        setCtaUrl('');
        setConfirmed(false);
        setSegment(DEFAULT_SEGMENT);
        router.refresh();
      }
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-xl border border-gray-200 bg-white p-6"
    >
      <h2 className="text-base font-semibold text-charcoal-deep">새 이메일 캠페인</h2>

      {isNightTime && (
        <div className="rounded-lg bg-sun-soft px-4 py-3 text-sm text-charcoal">
          ⚠️ 야간(21시~8시) 광고 발송 주의 — 수신자 경험에 영향을 줄 수 있습니다.
        </div>
      )}

      <section className="space-y-3 rounded-lg border border-gray-200 bg-canvas-soft p-4">
        <div>
          <h3 className="text-sm font-semibold text-charcoal-deep">받는 사람</h3>
          <p className="mt-1 text-xs text-charcoal-muted">
            그룹 전체를 고르거나, 명단에서 찾고, 명단에 없는 이메일을 직접 추가할 수 있습니다.
          </p>
        </div>

        <fieldset className="flex gap-2 rounded-lg border border-gray-200 bg-white p-1">
          <legend className="sr-only">받는 사람 구성 방식</legend>
          <button
            type="button"
            onClick={() => {
              setMode('segment');
              setConfirmed(false);
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'segment'
                ? 'bg-primary-strong text-white'
                : 'text-charcoal hover:bg-canvas-strong'
            }`}
          >
            그룹 전체 선택
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('search');
              setConfirmed(false);
            }}
            className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
              mode === 'search'
                ? 'bg-primary-strong text-white'
                : 'text-charcoal hover:bg-canvas-strong'
            }`}
          >
            개별로 추가
          </button>
        </fieldset>

        {mode === 'segment' && <AudienceSelector value={segment} onChange={setSegment} />}

        {mode === 'search' && (
          <div className="space-y-4">
            <ContactSearch selected={selectedContacts} onChange={setSelectedContacts} />

            <div className="space-y-2">
              <label
                htmlFor="broadcast-manual-emails"
                className="block text-sm font-medium text-charcoal"
              >
                이메일 직접 추가
              </label>
              <textarea
                id="broadcast-manual-emails"
                value={manualEmails}
                onChange={(e) => setManualEmails(e.target.value)}
                rows={3}
                placeholder={'name@example.com, another@example.com\n줄바꿈 또는 쉼표로 구분'}
                className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 font-mono text-sm"
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-charcoal-muted">
                  추가 가능 {manualSummary.valid.toLocaleString('ko-KR')}명
                  {manualSummary.invalid > 0 &&
                    ` · 형식 오류 ${manualSummary.invalid.toLocaleString('ko-KR')}건`}
                  {manualSummary.duplicate > 0 &&
                    ` · 입력 중복 ${manualSummary.duplicate.toLocaleString('ko-KR')}건`}
                  {manualSummary.alreadySelected > 0 &&
                    ` · 이미 추가됨 ${manualSummary.alreadySelected.toLocaleString('ko-KR')}건`}
                </p>
                <button
                  type="button"
                  onClick={addManualRecipients}
                  disabled={manualSummary.valid === 0}
                  className="rounded-lg border border-primary px-3 py-1.5 text-sm font-medium text-primary hover:bg-primary-soft disabled:opacity-50"
                >
                  입력한 이메일 추가
                </button>
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                checked={searchAdvertising}
                onChange={(e) => setSearchAdvertising(e.target.checked)}
                className="rounded border-gray-300"
              />
              광고성 메일 (수신자에게 (광고) 표기·발송사 정보 포함)
            </label>
          </div>
        )}
      </section>

      {/* 템플릿 선택 */}
      <TemplatePicker mode={mode} onSelect={applyTemplate} />

      {/* 제목 */}
      <div>
        <label htmlFor="broadcast-subject" className="mb-1 block text-sm font-medium text-charcoal">
          제목
          {(segment.channel === 'customer' || (mode === 'search' && searchAdvertising)) && (
            <span className="ml-1 font-normal text-charcoal-muted">
              (발송 시 자동으로 &quot;(광고)&quot; 접두어 추가됨)
            </span>
          )}
        </label>
        <input
          id="broadcast-subject"
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          required
          placeholder="이메일 제목"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {/* 본문 */}
      <div>
        <label htmlFor="broadcast-body" className="mb-1 block text-sm font-medium text-charcoal">
          본문 (마크다운)
        </label>
        <textarea
          id="broadcast-body"
          value={bodyMd}
          onChange={(e) => setBodyMd(e.target.value)}
          required
          rows={8}
          placeholder="이메일 본문을 입력하세요. 빈 줄로 문단을 구분합니다."
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm"
        />
      </div>

      {/* CTA */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="broadcast-cta-label"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            CTA 버튼 텍스트 (선택)
          </label>
          <input
            id="broadcast-cta-label"
            type="text"
            value={ctaLabel}
            onChange={(e) => setCtaLabel(e.target.value)}
            placeholder="자세히 보기"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="broadcast-cta-url"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            CTA URL (선택)
          </label>
          <input
            id="broadcast-cta-url"
            type="url"
            value={ctaUrl}
            onChange={(e) => setCtaUrl(e.target.value)}
            placeholder="https://www.saf2026.com/..."
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {submitBlockReason && <p className="text-sm text-danger-a11y">{submitBlockReason}</p>}

      {/* 발송 확인 체크박스 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="rounded border-gray-300"
        />
        받는 사람, 광고성 여부, 제목과 본문을 확인했습니다. 발송합니다.
      </label>

      {error && <p className="text-sm text-danger-a11y">{error}</p>}
      {success && <p className="text-sm text-success-a11y">{success}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={submitDisabled}
          className="rounded-lg bg-primary-strong px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-strong/90 disabled:opacity-50"
        >
          {isPending ? '발송 처리 중...' : '발송하기'}
        </button>
        <button
          type="button"
          disabled={isTestPending}
          onClick={() =>
            startTestTransition(async () => {
              const r = await sendTestEmail({
                subject,
                bodyMd,
                ctaLabel: ctaLabel || undefined,
                ctaUrl: ctaUrl || undefined,
                isAdvertisement: mode === 'search' ? searchAdvertising : segment.advertising,
              });
              if (r.error) setError(r.message);
              else setSuccess(r.message);
            })
          }
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-charcoal hover:bg-canvas-strong disabled:opacity-50"
        >
          {isTestPending ? '테스트 보내는 중...' : '나에게 테스트 보내기'}
        </button>
      </div>
    </form>
  );
}
