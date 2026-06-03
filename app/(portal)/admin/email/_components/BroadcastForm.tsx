'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enqueueBroadcast } from '@/app/actions/admin-broadcast';
import { TemplatePicker } from './TemplatePicker';
import { AudienceSelector, type SegmentSelection } from './AudienceSelector';
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

  // mode — only 'segment' is wired in this task; 'search' is a stub for a later task
  const [mode] = useState<Mode>('segment');

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

  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 8;

  const applyTemplate = (t: BroadcastTemplate) => {
    setSubject(t.subject);
    setBodyMd(t.bodyMd);
    setCtaLabel(t.ctaLabel ?? '');
    setCtaUrl(t.ctaUrl ?? '');
    setSegment((s) => ({
      ...s,
      advertising: t.isAdvertisement,
      ...(t.channel === 'customer' ? { channel: 'customer', isArtworkBuyer: false } : {}),
      ...(t.channel === 'member' || t.channel === 'petition'
        ? { channel: t.channel, isArtworkBuyer: false }
        : {}),
    }));
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

      {/* 템플릿 선택 */}
      <TemplatePicker mode={mode} onSelect={applyTemplate} />

      {/* 수신자 세그먼트 (mode === 'segment') */}
      {mode === 'segment' && <AudienceSelector value={segment} onChange={setSegment} />}

      {/* 제목 */}
      <div>
        <label htmlFor="broadcast-subject" className="mb-1 block text-sm font-medium text-charcoal">
          제목
          {segment.channel === 'customer' && (
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

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-primary-strong px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-strong/90 disabled:opacity-50"
      >
        {isPending ? '처리 중…' : '발송 예약'}
      </button>
    </form>
  );
}
