'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

interface ProgressBarProps {
  initialTotal: number;
  goal: number;
  /** 30초 폴링 (PRD §10.8) */
  pollIntervalMs?: number;
}

export default function ProgressBar({
  initialTotal,
  goal,
  pollIntervalMs = 30_000,
}: ProgressBarProps) {
  const t = useTranslations('petition.ohYoon');
  const [total, setTotal] = useState(initialTotal);

  useEffect(() => {
    // supabase env가 없으면 baseline 값만 노출하고 폴링 비활성 (dev에서 페이지를 다운시키지 않음)
    let supabase: ReturnType<typeof createSupabaseBrowserClient>;
    try {
      supabase = createSupabaseBrowserClient();
    } catch (err) {
      console.warn('[petition/progress] supabase 미설정 — baseline 값만 노출:', err);
      return;
    }

    let cancelled = false;

    async function refresh() {
      try {
        const { data } = await supabase
          .from('petition_counts')
          .select('total')
          .eq('petition_slug', PETITION_OH_YOON_SLUG)
          .maybeSingle();
        if (!cancelled && typeof data?.total === 'number') {
          setTotal(data.total);
        }
      } catch (err) {
        console.warn('[petition/progress] count fetch 실패:', err);
      }
    }

    void refresh();
    const id = window.setInterval(refresh, pollIntervalMs);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pollIntervalMs]);

  const ratio = Math.min(1, total / goal);
  const percent = Math.round(ratio * 100);

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-baseline justify-between mb-2 text-sm">
        <span className="font-semibold tabular-nums">
          {t('heroProgressLabel', {
            current: total.toLocaleString('ko-KR'),
            goal: goal.toLocaleString('ko-KR'),
          })}
        </span>
        <span className="tabular-nums opacity-80">{percent}%</span>
      </div>
      <div
        className="h-3 w-full rounded-full bg-white/20 overflow-hidden"
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={goal}
        aria-label={t('heroProgressLabel', {
          current: total.toLocaleString('ko-KR'),
          goal: goal.toLocaleString('ko-KR'),
        })}
      >
        <div
          className="h-full bg-sun-500 transition-[width] duration-700 ease-out"
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}
