'use client';

import { useTranslations } from 'next-intl';
import type { AdminCounts } from './types';

const HOUR_MS = 60 * 60 * 1000;

function daysUntil(iso: string | null): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * HOUR_MS)));
}

interface KpiBarProps {
  counts: AdminCounts;
}

export default function KpiBar({ counts }: KpiBarProps) {
  const t = useTranslations('admin.petition');
  const ratio = Math.min(1, counts.total / Math.max(1, counts.goal));
  const percent = Math.round(ratio * 100);
  const dn = daysUntil(counts.deadline_at);

  const deadlineLabel = counts.is_active
    ? dn !== null
      ? t('kpiDeadline', { days: dn })
      : t('kpiDeadlineUnknown')
    : t('kpiClosed');
  const deadlineSub = counts.is_active
    ? t('kpiDeadlineSub', { date: counts.deadline_at?.slice(0, 10) ?? t('kpiDeadlineDateUnknown') })
    : t('kpiClosedSub');

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label={t('kpiTotal')}
        value={counts.total.toLocaleString('ko-KR')}
        sub={t('kpiTotalSub', {
          percent,
          goal: counts.goal.toLocaleString('ko-KR'),
        })}
      />
      <KpiCard
        label={t('kpiCommittee')}
        value={counts.committee_total.toLocaleString('ko-KR')}
        sub={t('kpiCommitteeSub')}
      />
      <KpiCard
        label={t('kpiRegions')}
        value={t('kpiRegionsValue', { count: counts.region_top_count })}
        sub={t('kpiRegionsSub')}
      />
      <KpiCard
        label={deadlineLabel}
        value={t('kpiRecent24h', { count: counts.recent_24h.toLocaleString('ko-KR') })}
        sub={deadlineSub}
        accent={!counts.is_active}
      />
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={
        accent
          ? 'rounded-xl border border-primary/40 bg-primary-surface px-4 py-4'
          : 'rounded-xl border border-gray-200 bg-white px-4 py-4'
      }
    >
      <p className="text-xs font-semibold text-charcoal-muted uppercase tracking-wide mb-1">
        {label}
      </p>
      <p className="text-xl md:text-2xl font-bold text-charcoal-deep tabular-nums">{value}</p>
      {sub && <p className="mt-1 text-xs text-charcoal-muted">{sub}</p>}
    </div>
  );
}
