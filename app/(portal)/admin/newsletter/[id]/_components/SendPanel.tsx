'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';

import { previewAudience } from '@/app/actions/admin-broadcast';
import {
  cancelNewsletterSchedule,
  duplicateNewsletter,
  scheduleNewsletter,
  sendNewsletterNow,
  sendNewsletterTest,
} from '@/app/actions/admin-newsletter';
import {
  NEWSLETTER_CHANNELS,
  NEWSLETTER_CHANNEL_LABELS,
  type NewsletterChannel,
} from '@/lib/newsletter/channels';

interface Props {
  newsletterId: string;
  status: string;
  scheduledAt: string | null;
  slug: string;
  initialChannels: string[];
  dirty: boolean;
}

export function SendPanel({
  newsletterId,
  status,
  scheduledAt,
  slug,
  initialChannels,
  dirty,
}: Props) {
  const router = useRouter();
  const [channels, setChannels] = useState<NewsletterChannel[]>(() => {
    const initial = initialChannels.filter((c): c is NewsletterChannel =>
      NEWSLETTER_CHANNELS.includes(c as NewsletterChannel)
    );
    return initial.length > 0 ? initial : ['customer'];
  });
  const [counts, setCounts] = useState<Record<string, number> | null>(null);
  const [confirmMode, setConfirmMode] = useState(false);
  const [scheduleAt, setScheduleAt] = useState('');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);
  const [isActing, startActing] = useTransition();

  // 채널 선택 변경 시 수신자 수 갱신 (기존 count RPC 재사용)
  // cancelled ref로 경합 취소. counts=null은 비동기 완료 후 새 값으로 교체되어 처리.
  const countsGenRef = useRef(0);
  useEffect(() => {
    const gen = ++countsGenRef.current;
    Promise.all(channels.map((c) => previewAudience(c).then((r) => [c, r.total] as const))).then(
      (entries) => {
        if (gen === countsGenRef.current) setCounts(Object.fromEntries(entries));
      }
    );
  }, [channels]);

  const totalCount = counts ? Object.values(counts).reduce((a, b) => a + b, 0) : null;

  const run = (fn: () => Promise<{ message: string; error?: boolean }>, refresh = true) =>
    startActing(async () => {
      const result = await fn();
      setFeedback({ text: result.message, isError: Boolean(result.error) });
      setConfirmMode(false);
      if (!result.error && refresh) router.refresh();
    });

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-charcoal-deep">발송</h2>

      {feedback && (
        <p className={clsx('text-sm', feedback.isError ? 'text-danger-a11y' : 'text-success-a11y')}>
          {feedback.text}
        </p>
      )}

      {status === 'sending' && (
        <p className="text-sm text-charcoal-muted">
          발송 중입니다. 진행률은{' '}
          <Link href="/admin/email" className="text-primary-strong underline">
            이메일 발송 이력
          </Link>
          에서 확인하세요.
        </p>
      )}

      {status === 'sent' && (
        <div className="space-y-2 text-sm text-charcoal">
          <p>발송이 완료됐습니다.</p>
          <a
            href={`/newsletter/${slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-strong underline"
          >
            웹 아카이브에서 보기
          </a>
          <div>
            <button
              type="button"
              disabled={isActing}
              onClick={() =>
                startActing(async () => {
                  const result = await duplicateNewsletter(newsletterId);
                  if (result.error || !result.id) {
                    setFeedback({ text: result.message, isError: true });
                    return;
                  }
                  router.push(`/admin/newsletter/${result.id}`);
                })
              }
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
            >
              복제해서 다음 호 만들기
            </button>
          </div>
        </div>
      )}

      {status === 'scheduled' && (
        <div className="space-y-2 text-sm text-charcoal">
          <p>
            예약됨:{' '}
            <strong>
              {scheduledAt
                ? new Date(scheduledAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })
                : '—'}
            </strong>
          </p>
          <button
            type="button"
            disabled={isActing}
            onClick={() => run(() => cancelNewsletterSchedule(newsletterId))}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
          >
            예약 취소 (초안으로 되돌리기)
          </button>
        </div>
      )}

      {status === 'draft' && (
        <div className="space-y-4">
          {dirty && (
            <p className="rounded-lg border border-gray-200 bg-canvas-strong px-3 py-2 text-sm text-charcoal-muted">
              저장하지 않은 변경이 있습니다. 저장한 내용으로만 발송됩니다.
            </p>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-charcoal-muted">받는 사람</legend>
            {NEWSLETTER_CHANNELS.map((channel) => (
              <label key={channel} className="flex items-center gap-2 text-sm text-charcoal">
                <input
                  type="checkbox"
                  checked={channels.includes(channel)}
                  onChange={(e) =>
                    setChannels((prev) =>
                      e.target.checked ? [...prev, channel] : prev.filter((c) => c !== channel)
                    )
                  }
                />
                {NEWSLETTER_CHANNEL_LABELS[channel]}
                <span className="text-xs text-charcoal-muted">
                  {counts ? `${(counts[channel] ?? 0).toLocaleString('ko-KR')}명` : '집계 중…'}
                </span>
              </label>
            ))}
            <p className="text-xs text-charcoal-soft">
              두 채널 모두 선택해도 중복 수신자는 1통만 받습니다. (합계{' '}
              {totalCount === null ? '집계 중…' : `최대 ${totalCount.toLocaleString('ko-KR')}명`})
            </p>
          </fieldset>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isActing}
              onClick={() => run(() => sendNewsletterTest(newsletterId), false)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-charcoal hover:bg-canvas-soft disabled:opacity-50"
            >
              내게 테스트 발송
            </button>

            {!confirmMode ? (
              <button
                type="button"
                disabled={isActing || channels.length === 0}
                onClick={() => setConfirmMode(true)}
                className="rounded-lg bg-primary-strong px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                지금 발송…
              </button>
            ) : (
              <span className="flex items-center gap-2 rounded-lg border border-primary/40 bg-primary-surface px-3 py-2 text-sm">
                <span className="text-charcoal">
                  {totalCount === null ? '' : `최대 ${totalCount.toLocaleString('ko-KR')}명에게 `}
                  즉시 발송할까요?
                </span>
                <button
                  type="button"
                  disabled={isActing}
                  onClick={() => run(() => sendNewsletterNow(newsletterId, channels))}
                  className="rounded bg-primary-strong px-3 py-1 font-semibold text-white disabled:opacity-50"
                >
                  발송 확정
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmMode(false)}
                  className="text-charcoal-muted underline"
                >
                  취소
                </button>
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-end gap-2 border-t border-gray-100 pt-3">
            <label className="block space-y-1">
              <span className="text-xs font-medium text-charcoal-muted">예약 발송 시각 (KST)</span>
              <input
                type="datetime-local"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
                className="block rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="button"
              disabled={isActing || !scheduleAt || channels.length === 0}
              onClick={() =>
                run(() =>
                  scheduleNewsletter(newsletterId, channels, new Date(scheduleAt).toISOString())
                )
              }
              className="rounded-lg border border-primary-strong px-3 py-2 text-sm font-semibold text-primary-strong hover:bg-primary-surface disabled:opacity-50"
            >
              예약하기
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
