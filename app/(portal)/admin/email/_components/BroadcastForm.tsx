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

  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 8;

  const applyTemplate = (t: BroadcastTemplate) => {
    setSubject(t.subject);
    setBodyMd(t.bodyMd);
    setCtaLabel(t.ctaLabel ?? '');
    setCtaUrl(t.ctaUrl ?? '');
    if (t.channel === 'individual') {
      // individual 템플릿 → 검색 발송 모드에서만 의미 있음
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

      {/* 발송 모드 토글 */}
      <fieldset className="flex gap-2 rounded-lg border border-gray-200 p-1">
        <legend className="sr-only">발송 모드 선택</legend>
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
          세그먼트 발송
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
          검색 발송
        </button>
      </fieldset>

      {/* 템플릿 선택 */}
      <TemplatePicker mode={mode} onSelect={applyTemplate} />

      {/* 수신자 세그먼트 (mode === 'segment') */}
      {mode === 'segment' && <AudienceSelector value={segment} onChange={setSegment} />}

      {/* 연락처 검색 (mode === 'search') */}
      {mode === 'search' && (
        <div className="space-y-3">
          <ContactSearch selected={selectedContacts} onChange={setSelectedContacts} />
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

      {/* 발송 확인 체크박스 */}
      <label className="flex cursor-pointer items-center gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="rounded border-gray-300"
        />
        수신자 목록을 확인했으며 발송을 확정합니다.
      </label>

      {error && <p className="text-sm text-danger-a11y">{error}</p>}
      {success && <p className="text-sm text-success-a11y">{success}</p>}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending || (mode === 'search' && selectedContacts.length === 0)}
          className="rounded-lg bg-primary-strong px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-strong/90 disabled:opacity-50"
        >
          {isPending ? '처리 중…' : '발송 예약'}
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
          {isTestPending ? '발송 중…' : '나에게 테스트 발송'}
        </button>
      </div>
    </form>
  );
}
