'use client';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

interface Props {
  slug: string;
  initialPercent: number;
  initialRaised: number;
  initialBackers: number;
  endAt: string | null;
}

export default function FundingProgressBar({
  slug,
  initialPercent,
  initialRaised,
  initialBackers,
  endAt,
}: Props) {
  const t = useTranslations('funding');
  const [percent, setPercent] = useState(initialPercent);
  const [raised, setRaised] = useState(initialRaised);
  const [backers, setBackers] = useState(initialBackers);
  const [nowMs, setNowMs] = useState<number | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setNowMs(Date.now()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await fetch(`/api/funding/${slug}/status`, { cache: 'no-store' });
        if (!r.ok || !active) return;
        const d = await r.json();
        setPercent(d.percent);
        setRaised(d.raised_amount);
        setBackers(d.backer_count);
      } catch {
        /* 폴링 실패는 무시(다음 주기 재시도) */
      }
    };
    const id = setInterval(poll, 5 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [slug]);

  const dday =
    endAt !== null && nowMs !== null
      ? Math.max(0, Math.ceil((new Date(endAt).getTime() - nowMs) / 86400000))
      : null;

  return (
    <div className="rounded-2xl bg-canvas-soft p-6 shadow-sm">
      <div className="flex items-baseline justify-between">
        <span className="text-3xl font-bold text-sun-strong">
          {raised.toLocaleString('ko-KR')}원
        </span>
        <span className="text-charcoal-muted">{percent}%</span>
      </div>
      <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className="h-full rounded-full bg-primary-strong transition-[width] duration-500"
          style={{ width: `${percent}%` }}
        />
      </div>
      <div className="mt-3 flex justify-between text-sm text-charcoal-muted">
        <span>{t('backers', { count: backers })}</span>
        {dday !== null && <span>{t('daysLeft', { days: dday })}</span>}
      </div>
    </div>
  );
}
