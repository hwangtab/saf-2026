'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { createSupabaseBrowserClient } from '@/lib/auth/client';
import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

interface ProgressBarProps {
  initialTotal: number;
  goal: number;
  /** 보조 지표 (PRD §14 OQ-6 권고 — 모멘텀 보호) */
  initialRegionTopCount?: number;
  initialRecent24h?: number;
  /** 30초 폴링 (PRD §10.8) */
  pollIntervalMs?: number;
}

export default function ProgressBar({
  initialTotal,
  goal,
  initialRegionTopCount = 0,
  initialRecent24h = 0,
  pollIntervalMs = 30_000,
}: ProgressBarProps) {
  const t = useTranslations('petition.ohYoon');
  const [total, setTotal] = useState(initialTotal);
  const [regionTopCount, setRegionTopCount] = useState(initialRegionTopCount);
  const [recent24h, setRecent24h] = useState(initialRecent24h);

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
          .select('total, region_top_count, recent_24h')
          .eq('petition_slug', PETITION_OH_YOON_SLUG)
          .maybeSingle();
        if (cancelled || !data) return;
        if (typeof data.total === 'number') setTotal(data.total);
        if (typeof data.region_top_count === 'number') setRegionTopCount(data.region_top_count);
        if (typeof data.recent_24h === 'number') setRecent24h(data.recent_24h);
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
  // 시각 보정: 1만 명 목표 대비 초기 0~수십 명에서 막대가 거의 안 보이는 무력감 완화.
  // ARIA value(`aria-valuenow`)는 실제 값 그대로, 시각만 floor 적용.
  const visualWidthPct = Math.max(ratio * 100, 1.5);

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
          className="h-full bg-primary transition-[width] duration-700 ease-out"
          style={{ width: `${visualWidthPct}%` }}
        />
      </div>
      {/* 보조 지표 — 모멘텀 신호 (PRD §14 OQ-6) */}
      {(regionTopCount > 0 || recent24h > 0) && (
        <p className="mt-2 text-xs opacity-75 tabular-nums text-center">
          {t('heroProgressRegions', { count: regionTopCount.toLocaleString('ko-KR') })}
          {' · '}
          {t('heroProgressRecent24h', { count: recent24h.toLocaleString('ko-KR') })}
        </p>
      )}
    </div>
  );
}
