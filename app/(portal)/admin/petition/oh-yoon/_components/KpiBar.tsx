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
  const ratio = Math.min(1, counts.total / Math.max(1, counts.goal));
  const percent = Math.round(ratio * 100);
  const dn = daysUntil(counts.deadline_at);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <KpiCard
        label="총 서명자"
        value={counts.total.toLocaleString('ko-KR')}
        sub={`${percent}% / 목표 ${counts.goal.toLocaleString('ko-KR')}`}
      />
      <KpiCard
        label="추진위원 신청"
        value={counts.committee_total.toLocaleString('ko-KR')}
        sub="+이름 발족 선언문에 게재"
      />
      <KpiCard
        label="참여 시·도"
        value={`${counts.region_top_count} / 17`}
        sub="해외 제외 광역 분포"
      />
      <KpiCard
        label={counts.is_active ? `마감까지 D-${dn ?? '?'}` : '마감 완료'}
        value={`24h 신규 ${counts.recent_24h.toLocaleString('ko-KR')}`}
        sub={counts.is_active ? `마감 ${counts.deadline_at?.slice(0, 10) ?? '미정'}` : '폼 비활성'}
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
