import type { ReactNode } from 'react';

interface HomeFunnelData {
  funnel: {
    home_visitors: number;
    home_clickers: number;
    detail_viewers: number;
    purchase_clickers: number;
  } | null;
  sectionViews: Array<{ section: string; views: number; visitors: number }>;
  ctaClicks: Array<{
    event_name: string;
    section: string | null;
    clicks: number;
    clickers: number;
  }>;
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-4 py-3">
      <p className="text-xs text-charcoal-muted">{label}</p>
      <p className="text-2xl font-bold text-charcoal-deep tabular-nums">{value}</p>
      {sub && <p className="text-xs text-charcoal-soft">{sub}</p>}
    </div>
  );
}

function rate(n: number, d: number): string {
  if (!d) return '—';
  return `${((n / d) * 100).toFixed(1)}%`;
}

export default function HomeFunnelPanel({ data }: { data: HomeFunnelData }) {
  const f = data.funnel;
  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold text-charcoal-deep">홈 진입 퍼널</h2>
      {f ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Stat label="홈 노출(고유)" value={f.home_visitors.toLocaleString()} />
          <Stat
            label="홈 클릭(고유)"
            value={f.home_clickers.toLocaleString()}
            sub={`전환 ${rate(f.home_clickers, f.home_visitors)}`}
          />
          <Stat
            label="작품상세 도달"
            value={f.detail_viewers.toLocaleString()}
            sub={`클릭→상세 ${rate(f.detail_viewers, f.home_clickers)}`}
          />
          <Stat
            label="구매 클릭"
            value={f.purchase_clickers.toLocaleString()}
            sub={`상세→구매 ${rate(f.purchase_clickers, f.detail_viewers)}`}
          />
        </div>
      ) : (
        <p className="text-sm text-charcoal-muted">데이터 없음</p>
      )}

      <h3 className="text-sm font-bold text-charcoal-deep mt-4">섹션별 노출/클릭</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-charcoal-muted">
              <th className="py-1">섹션</th>
              <th className="py-1">노출(고유)</th>
              <th className="py-1">클릭(이벤트별)</th>
            </tr>
          </thead>
          <tbody>
            {data.sectionViews.map((s) => {
              const clicks = data.ctaClicks
                .filter((c) => c.section === s.section)
                .map((c) => `${c.event_name}:${c.clicks}`)
                .join(', ');
              return (
                <tr key={s.section} className="border-t border-gray-100">
                  <td className="py-1 font-medium text-charcoal-deep">{s.section}</td>
                  <td className="py-1 tabular-nums">{s.visitors.toLocaleString()}</td>
                  <td className="py-1 text-charcoal-muted">{clicks || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
