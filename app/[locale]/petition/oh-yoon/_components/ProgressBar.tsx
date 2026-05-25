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

  // 라운드 시스템: 1만 명 달성마다 다음 라운드 시작. 1라운드(1만), 2라운드(2만), 3라운드(3만)…
  // 막대 너비는 effectiveGoal 기준으로 누적 표시 — 1만 도달 시 좌측 절반이 primary로
  // "고정"되고, 다음 라운드 진행분이 success 색으로 이어 자란다.
  const round = total < goal ? 1 : Math.ceil(total / goal);
  const effectiveGoal = round * goal;
  const ratio = Math.min(1, total / effectiveGoal);
  const percent = Math.round(ratio * 100);
  const visualWidthPct = Math.max(ratio * 100, 1.5);
  // round >= 2일 때 segment 분리 — primary(이전 라운드 누적) + success(현재 라운드 진행)
  const primarySegmentPct = round >= 2 ? (((round - 1) * goal) / effectiveGoal) * 100 : 0;
  const successSegmentPct =
    round >= 2 ? Math.max(0, ((total - (round - 1) * goal) / effectiveGoal) * 100) : 0;

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-baseline justify-between mb-2 text-sm">
        <span className="font-semibold tabular-nums">
          {t('heroProgressLabel', {
            current: total.toLocaleString('ko-KR'),
            goal: effectiveGoal.toLocaleString('ko-KR'),
          })}
        </span>
        <span className="tabular-nums opacity-80">{percent}%</span>
      </div>
      <div
        className="relative h-3 w-full rounded-full bg-white/20 overflow-hidden flex"
        role="progressbar"
        aria-valuenow={total}
        aria-valuemin={0}
        aria-valuemax={effectiveGoal}
        aria-label={t('heroProgressLabel', {
          current: total.toLocaleString('ko-KR'),
          goal: effectiveGoal.toLocaleString('ko-KR'),
        })}
      >
        {round === 1 ? (
          <div
            className="h-full bg-primary transition-[width] duration-500 ease-out"
            style={{ width: `${visualWidthPct}%` }}
          />
        ) : (
          <>
            <div
              className="h-full bg-primary transition-[width] duration-500 ease-out"
              style={{ width: `${primarySegmentPct}%` }}
            />
            <div
              className="h-full bg-success transition-[width] duration-500 ease-out"
              style={{ width: `${successSegmentPct}%` }}
            />
            {/* 라운드 경계 마커 — 1만, 2만 등 각 라운드 시작점을 흰 세로선으로 표시.
                round >= 2일 때만 그리고, round-1개의 선이 effectiveGoal 기준 균등 분할 위치에 박힌다. */}
            {Array.from({ length: round - 1 }).map((_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="absolute top-0 bottom-0 w-px bg-white/50"
                style={{ left: `${(((i + 1) * goal) / effectiveGoal) * 100}%` }}
              />
            ))}
          </>
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
