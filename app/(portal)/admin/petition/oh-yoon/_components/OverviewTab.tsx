'use client';

import { useState, useTransition } from 'react';

import { forceCloseCampaign, reopenCampaign } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminCounts, AdminRegionRow } from './types';
import CsvDownloadButtons from './CsvDownloadButtons';

interface OverviewTabProps {
  counts: AdminCounts;
  regionBreakdown: AdminRegionRow[];
}

export default function OverviewTab({ counts, regionBreakdown }: OverviewTabProps) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  const max = regionBreakdown[0]?.count ?? 1;

  function handleClose() {
    if (
      !confirm('청원을 강제 마감합니다. 폼이 비활성화되고 카운터가 동결됩니다. 계속하시겠습니까?')
    )
      return;
    startTransition(async () => {
      const r = await forceCloseCampaign();
      setMsg(r.message ?? (r.ok ? '강제 마감 완료' : '실패'));
    });
  }
  function handleReopen() {
    if (!confirm('청원을 재개합니다. 폼이 다시 활성화됩니다. 계속하시겠습니까?')) return;
    startTransition(async () => {
      const r = await reopenCampaign();
      setMsg(r.message ?? (r.ok ? '재개 완료' : '실패'));
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">지역별 분포</h2>
        {regionBreakdown.length === 0 ? (
          <p className="text-sm text-charcoal-muted">아직 서명이 없습니다.</p>
        ) : (
          <ul className="space-y-1.5">
            {regionBreakdown.map((r) => {
              const label = getRegionByKey(r.region_top)?.label ?? r.region_top;
              const ratio = (r.count / max) * 100;
              return (
                <li
                  key={r.region_top}
                  className="grid grid-cols-[8rem_1fr_4rem] items-center gap-3 text-sm"
                >
                  <span className="text-charcoal-deep">{label}</span>
                  <span className="relative h-5 rounded-full bg-gray-100 overflow-hidden">
                    <span
                      className="absolute left-0 top-0 h-full bg-primary/80"
                      style={{ width: `${ratio}%` }}
                    />
                  </span>
                  <span className="text-right tabular-nums text-charcoal-muted">
                    {r.count.toLocaleString('ko-KR')}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">데이터 내보내기</h2>
        <CsvDownloadButtons />
      </section>

      <section>
        <h2 className="text-lg font-semibold text-charcoal-deep mb-3">청원 상태 제어</h2>
        <div className="flex flex-wrap gap-2 items-center">
          {counts.is_active ? (
            <button
              type="button"
              onClick={handleClose}
              disabled={pending}
              className="rounded-lg border border-danger/40 bg-white px-4 py-2 text-sm font-semibold text-danger-a11y hover:bg-danger/10 disabled:opacity-60"
            >
              청원 강제 마감
            </button>
          ) : (
            <button
              type="button"
              onClick={handleReopen}
              disabled={pending}
              className="rounded-lg border border-primary/40 bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              청원 재개
            </button>
          )}
          {msg && (
            <span role="status" className="text-sm text-charcoal-muted">
              {msg}
            </span>
          )}
        </div>
        <p className="mt-2 text-xs text-charcoal-muted break-keep">
          마감 시각 도래 시 pg_cron이 자동으로 close_petition 함수를 실행합니다 (활성화 시).
          여기서는 마감일 전 강제 종료/재개를 수동으로 트리거합니다.
        </p>
      </section>
    </div>
  );
}
