'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { enqueueBroadcast } from '@/app/actions/admin-broadcast';
import { AudiencePreview } from './AudiencePreview';
import type { BroadcastChannel } from '@/lib/email/audiences/types';

const CHANNEL_OPTIONS: { value: BroadcastChannel; label: string; available: boolean }[] = [
  { value: 'member', label: '작가·출품자 업무', available: true },
  { value: 'customer', label: '고객 마케팅 (광고)', available: true },
  { value: 'petition', label: '청원 캠페인 알림', available: true },
];

export function BroadcastForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [channel, setChannel] = useState<BroadcastChannel>('member');
  const [subject, setSubject] = useState('');
  const [bodyMd, setBodyMd] = useState('');
  const [ctaLabel, setCtaLabel] = useState('');
  const [ctaUrl, setCtaUrl] = useState('');
  const [petitionSlug, setPetitionSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const hour = new Date().getHours();
  const isNightTime = hour >= 21 || hour < 8;

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
        channel,
        subject,
        bodyMd,
        ctaLabel: ctaLabel || undefined,
        ctaUrl: ctaUrl || undefined,
        petitionSlug: channel === 'petition' ? petitionSlug : undefined,
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

      <div>
        <label htmlFor="broadcast-channel" className="mb-1 block text-sm font-medium text-charcoal">
          채널
        </label>
        <select
          id="broadcast-channel"
          value={channel}
          onChange={(e) => setChannel(e.target.value as BroadcastChannel)}
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          {CHANNEL_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} disabled={!opt.available}>
              {opt.label}
              {!opt.available ? ' (준비 중)' : ''}
            </option>
          ))}
        </select>
        <div className="mt-2">
          <AudiencePreview channel={channel} />
        </div>
      </div>

      {channel === 'petition' && (
        <div>
          <label
            htmlFor="broadcast-petition-slug"
            className="mb-1 block text-sm font-medium text-charcoal"
          >
            청원 슬러그
          </label>
          <input
            id="broadcast-petition-slug"
            type="text"
            value={petitionSlug}
            onChange={(e) => setPetitionSlug(e.target.value)}
            placeholder="oh-yoon"
            className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
      )}

      <div>
        <label htmlFor="broadcast-subject" className="mb-1 block text-sm font-medium text-charcoal">
          제목
          {channel === 'customer' && (
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
        className="rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-strong disabled:opacity-50"
      >
        {isPending ? '처리 중…' : '발송 예약'}
      </button>
    </form>
  );
}
