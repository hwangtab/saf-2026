'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';

import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';

interface ProgressBarProps {
  goal: number;
  /** 5분 폴링 + visibility 가드 (탭 숨김 시 일시 중단) */
  pollIntervalMs?: number;
}

export default function ProgressBar({ goal, pollIntervalMs = 300_000 }: ProgressBarProps) {
  const t = useTranslations('petition.ohYoon');
  const [total, setTotal] = useState(0);
  const [regionTopCount, setRegionTopCount] = useState(0);
  const [recent24h, setRecent24h] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: number | null = null;

    async function refresh() {
      try {
        const res = await fetch(`/api/petition/${PETITION_OH_YOON_SLUG}/counts`, {
          cache: 'no-store',
        });
        if (!res.ok) return;
        const data: { total: number; region_top_count: number; recent_24h: number } =
          await res.json();
        if (cancelled) return;
        if (typeof data.total === 'number') setTotal(data.total);
        if (typeof data.region_top_count === 'number') setRegionTopCount(data.region_top_count);
        if (typeof data.recent_24h === 'number') setRecent24h(data.recent_24h);
      } catch (err) {
        console.warn('[petition/progress] count fetch 실패:', err);
      }
    }

    function startPolling() {
      void refresh();
      intervalId = window.setInterval(refresh, pollIntervalMs);
    }

    function stopPolling() {
      if (intervalId !== null) {
        window.clearInterval(intervalId);
        intervalId = null;
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        startPolling();
      } else {
        stopPolling();
      }
    }

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      cancelled = true;
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [pollIntervalMs]);

  const ratio = Math.min(1, total / goal);
  const percent = Math.round(ratio * 100);
  // 시각 보정: 1만 명 목표 대비 초기 0~수십 명에서 막대가 거의 안 보이는 무력감 완화.
  // ARIA value(`aria-valuenow`)는 실제 값 그대로, 시각만 floor 적용.
  const visualWidthPct = Math.max(ratio * 100, 1.5);
  // 1만 도달 시 막대 색이 primary→success로 전환 = "달성" 시각 신호.
  // 1만 초과 시 막대 우측 끝에 흰 배지 "+N명"으로 초과 수치 표시 — 막대 자체는 100% 가득.
  const achievedGoal = total >= goal;
  const excess = Math.max(0, total - goal);

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
      <div className="relative">
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
            className={`h-full transition-[width,background-color] duration-500 ease-out ${
              achievedGoal ? 'bg-success' : 'bg-primary'
            }`}
            style={{ width: `${visualWidthPct}%` }}
          />
        </div>
        {excess > 0 && (
          <span className="absolute top-1/2 right-0 -translate-y-1/2 translate-x-1 inline-flex items-center bg-white text-charcoal-deep text-[11px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap tabular-nums">
            {t('heroProgressExcessBadge', { count: excess.toLocaleString('ko-KR') })}
          </span>
        )}
      </div>
      {/* 보조 지표 — 모멘텀 신호 (PRD §14 OQ-6).
          SSR에서 0으로 내려와 미렌더 → useEffect refresh 후 실값 오면 추가됨
          → Hero section 전체가 push되며 CLS 1.0 회귀 직접 원인. 항상 렌더 + invisible 토글로
          height reserve. aria-hidden으로 screen reader엔 0건 정보 숨김(PRD §14 OQ-6 의도 유지). */}
      <p
        className={`mt-2 text-xs opacity-75 tabular-nums text-center ${
          regionTopCount > 0 || recent24h > 0 ? '' : 'invisible'
        }`}
        aria-hidden={!(regionTopCount > 0 || recent24h > 0)}
      >
        {t('heroProgressRegions', { count: regionTopCount.toLocaleString('ko-KR') })}
        {' · '}
        {t('heroProgressRecent24h', { count: recent24h.toLocaleString('ko-KR') })}
      </p>
    </div>
  );
}
