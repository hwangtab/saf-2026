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

  // 목표 초과 시 막대 스케일을 현재 총합으로 전환해 목표선(작대기)을 막대 안에 표기.
  // 초과 전에는 기존 동작 유지 — 단일 fill, primary→success 전환.
  const over = total > goal;
  const ratio = Math.min(1, total / goal);
  const percent = Math.round((total / goal) * 100);
  // 시각 보정: 1만 명 목표 대비 초기 0~수십 명에서 막대가 거의 안 보이는 무력감 완화.
  // ARIA value(`aria-valuenow`)는 실제 값 그대로, 시각만 floor 적용.
  const visualWidthPct = Math.max(ratio * 100, 1.5);
  const achievedGoal = total >= goal;
  // 목표선 위치(%) — 초과 시 "goal / total", 미달 시 사용 안 함(라벨 invisible 상태).
  const goalPct = over ? (goal / total) * 100 : 100;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-baseline justify-between mb-2 text-sm">
        <span className="font-semibold tabular-nums">
          {t('heroProgressLabel', { current: total.toLocaleString('ko-KR') })}
        </span>
        <span className="tabular-nums opacity-80">{percent}%</span>
      </div>
      <div className="relative">
        <progress
          className="sr-only"
          value={total}
          max={over ? total : goal}
          aria-label={t('heroProgressLabel', { current: total.toLocaleString('ko-KR') })}
        />
        <div
          className="h-3 w-full rounded-full bg-white/20 overflow-hidden relative"
          aria-hidden="true"
        >
          {over ? (
            <>
              {/* 목표까지 primary 블루 — 미달 막대와 색 연속성 */}
              <div
                className="absolute inset-y-0 left-0 bg-primary transition-[width] duration-500 ease-out"
                style={{ width: `${goalPct}%` }}
              />
              {/* 초과분 sun 노랑 — 목표를 넘어선 강조 */}
              <div
                className="absolute inset-y-0 bg-sun transition-[left] duration-500 ease-out"
                style={{ left: `${goalPct}%`, right: 0 }}
              />
              {/* 목표선 작대기 */}
              <div
                className="absolute inset-y-0 w-0.5 bg-white/80 transition-[left] duration-500 ease-out"
                style={{ left: `${goalPct}%` }}
              />
            </>
          ) : (
            <div
              className={`h-full transition-[width,background-color] duration-500 ease-out ${
                achievedGoal ? 'bg-success' : 'bg-primary'
              }`}
              style={{ width: `${visualWidthPct}%` }}
            />
          )}
        </div>
        {/* 목표선 라벨 — 작대기 바로 아래, 작대기에 우측 정렬.
            invisible로 height 항상 예약(CLS 방지 — 초기 SSR total=0 → over=false 후 true 전환 시). */}
        <div
          className={`mt-0.5 text-[11px] font-semibold text-white/90 tabular-nums whitespace-nowrap flex justify-end ${over ? '' : 'invisible'}`}
          style={{ paddingRight: `${100 - goalPct}%` }}
          aria-hidden={!over}
        >
          {t('heroProgressGoalMarker', { goal: goal.toLocaleString('ko-KR') })}
        </div>
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
