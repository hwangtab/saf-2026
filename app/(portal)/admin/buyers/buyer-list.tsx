'use client';

import { useCallback, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type {
  ExhibitionBuyerAnalyticsRow,
  ExhibitionPurchaseAnalytics,
} from '@/lib/admin/exhibition-purchase-analytics';
import { matchesAnySearch } from '@/lib/search-utils';
import { csvSafeCell } from '@/lib/utils/csv';

type SortKey = 'revenue' | 'purchaseCount' | 'artworkCount' | 'buyerName' | 'lastPurchaseDate';
type SortDir = 'asc' | 'desc';

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatDate(iso: string) {
  if (!iso) return '-';
  return iso.slice(0, 10);
}

function formatChannels(channels: string[]) {
  return channels.length > 0 ? channels.join(' · ') : '-';
}

function formatPercent(part: number, total: number) {
  if (total <= 0) return '0.0%';
  return `${((part / total) * 100).toFixed(1)}%`;
}

function sortIndicator(sortKey: SortKey, sortDir: SortDir, key: SortKey) {
  if (sortKey !== key) return <span className="ml-1 text-charcoal-soft">↕</span>;
  return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
}

export function ExhibitionPurchaseAnalyticsView({
  analytics,
}: {
  analytics: ExhibitionPurchaseAnalytics;
}) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('revenue');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    const trimmed = search.trim();
    if (!trimmed) return analytics.buyers;
    return analytics.buyers.filter((buyer) =>
      matchesAnySearch(trimmed, [
        buyer.buyerName,
        buyer.buyerPhone,
        formatChannels(buyer.channels),
        buyer.deliverySummary,
        buyer.paidSummary,
        buyer.releaseSummary,
      ])
    );
  }, [analytics.buyers, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'revenue':
          cmp = a.revenue - b.revenue;
          break;
        case 'purchaseCount':
          cmp = a.purchaseCount - b.purchaseCount;
          break;
        case 'artworkCount':
          cmp = a.artworkCount - b.artworkCount;
          break;
        case 'buyerName':
          cmp = a.buyerName.localeCompare(b.buyerName, 'ko');
          break;
        case 'lastPurchaseDate':
          cmp = a.lastPurchaseDate.localeCompare(b.lastPurchaseDate);
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortDir, sortKey]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDir(key === 'buyerName' ? 'asc' : 'desc');
  }

  const exportCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push(
      '구매자,연락처,구매 수량,작품 수,총 구매액,평균 구매액,최근 구매일,구매경로,배송상태,입금상태,반출상태'
    );
    for (const buyer of sorted) {
      lines.push(
        [
          csvSafeCell(buyer.buyerName),
          csvSafeCell(buyer.buyerPhone || ''),
          csvSafeCell(buyer.purchaseCount),
          csvSafeCell(buyer.artworkCount),
          csvSafeCell(buyer.revenue),
          csvSafeCell(buyer.averagePurchaseAmount),
          csvSafeCell(formatDate(buyer.lastPurchaseDate)),
          csvSafeCell(formatChannels(buyer.channels)),
          csvSafeCell(buyer.deliverySummary),
          csvSafeCell(buyer.paidSummary),
          csvSafeCell(buyer.releaseSummary),
        ].join(',')
      );
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'saf2026-exhibition-purchase-analysis.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="전시 총 매출"
          value={krwFormatter.format(analytics.summary.totalRevenue)}
          subValue={`${numberFormatter.format(analytics.summary.saleQuantity)}점 판매`}
        />
        <MetricCard
          label="고유 구매자"
          value={`${numberFormatter.format(analytics.summary.uniqueBuyerCount)}명`}
          subValue={`재구매 ${numberFormatter.format(analytics.summary.repeatBuyerCount)}명`}
        />
        <MetricCard
          label="평균 객단가"
          value={krwFormatter.format(analytics.summary.averageCustomerRevenue)}
          subValue="구매자 1명 기준"
        />
        <MetricCard
          label="2점 이상 구매"
          value={`${numberFormatter.format(analytics.summary.twoPlusArtworkBuyerCount)}명`}
          subValue={formatPercent(
            analytics.summary.twoPlusArtworkBuyerCount,
            analytics.summary.uniqueBuyerCount
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <OperationalCard
          title="배송 체크"
          rows={[
            [
              '배송 필요',
              `${numberFormatter.format(analytics.operational.shippingRequiredCount)}점`,
            ],
            [
              '배송 완료',
              `${numberFormatter.format(analytics.operational.shippingCompletedCount)}점`,
            ],
            [
              '배송 미확인',
              `${numberFormatter.format(analytics.operational.shippingUnknownCount)}점`,
            ],
          ]}
        />
        <DistributionCard
          title="입금 상태"
          rows={analytics.paidStatuses.map((row) => ({
            label: row.label,
            value: row.count,
            display: `${numberFormatter.format(row.count)}점`,
          }))}
        />
        <DistributionCard
          title="반출 상태"
          rows={analytics.releaseStatuses.map((row) => ({
            label: row.label,
            value: row.count,
            display: `${numberFormatter.format(row.count)}점`,
          }))}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <DistributionCard
          title="구매 경로별 매출"
          rows={analytics.purchaseChannels.map((row) => ({
            label: row.label,
            value: row.revenue,
            display: `${krwFormatter.format(row.revenue)} · ${numberFormatter.format(row.quantity)}점`,
          }))}
        />
        <DistributionCard
          title="배송 상태별 수량"
          rows={analytics.deliveryStatuses.map((row) => ({
            label: row.label,
            value: row.count,
            display: `${numberFormatter.format(row.count)}점`,
          }))}
        />
        <DistributionCard
          title="구매 수량 구간"
          rows={analytics.purchaseBuckets.map((row) => ({
            label: row.label,
            value: row.buyerCount,
            display: `${numberFormatter.format(row.buyerCount)}명`,
          }))}
        />
      </div>

      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-1 items-center gap-3">
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="구매자, 연락처, 상태 검색..."
              className="h-10 w-full max-w-sm rounded-md border border-[var(--admin-border)] bg-white px-3 text-sm text-charcoal-deep shadow-sm transition placeholder:text-charcoal-soft focus-visible:border-primary-a11y focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
            />
            <span className="shrink-0 text-sm text-charcoal-soft">
              {numberFormatter.format(filtered.length)}명
              {search.trim() ? ` / ${numberFormatter.format(analytics.buyers.length)}명` : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--admin-border)] bg-white px-4 text-sm font-medium text-charcoal-deep shadow-sm transition hover:bg-charcoal/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            CSV
          </button>
        </div>

        <AdminCard className="overflow-hidden">
          <AdminCardHeader className="rounded-t-2xl">
            <div>
              <h2 className="text-base font-semibold text-charcoal-deep">상위 구매자</h2>
              <p className="mt-1 text-xs text-charcoal-soft">
                전시 구매 고객별 매출과 반복 구매 흐름을 확인합니다.
              </p>
            </div>
          </AdminCardHeader>

          {sorted.length === 0 ? (
            <AdminEmptyState
              title="구매자 없음"
              description="검색 조건에 맞는 구매자가 없습니다."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-[var(--admin-border-soft)]">
                <thead className="bg-charcoal/5 text-xs font-semibold uppercase text-charcoal-soft">
                  <tr>
                    <th className="px-4 py-3 text-left">#</th>
                    <SortableTh
                      label="구매자"
                      sortKey="buyerName"
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 text-left">연락처</th>
                    <SortableTh
                      align="right"
                      label="구매 수량"
                      sortKey="purchaseCount"
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      align="right"
                      label="작품 수"
                      sortKey="artworkCount"
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <th className="px-4 py-3 text-right">구매경로</th>
                    <th className="px-4 py-3 text-right">배송상태</th>
                    <SortableTh
                      align="right"
                      label="최근 구매"
                      sortKey="lastPurchaseDate"
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                    <SortableTh
                      align="right"
                      label="총 구매액"
                      sortKey="revenue"
                      activeSortKey={sortKey}
                      sortDir={sortDir}
                      onSort={toggleSort}
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border-soft)] bg-white text-sm">
                  {sorted.map((buyer, index) => (
                    <BuyerRow key={buyer.buyerName} buyer={buyer} index={index} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </section>
    </div>
  );
}

function MetricCard({
  label,
  value,
  subValue,
}: {
  label: string;
  value: string;
  subValue: string;
}) {
  return (
    <AdminCard className="p-5">
      <p className="text-sm font-medium text-charcoal-soft">{label}</p>
      <p className="mt-2 truncate text-2xl font-bold tracking-tight text-charcoal-deep">{value}</p>
      <p className="mt-2 text-sm text-charcoal-muted">{subValue}</p>
    </AdminCard>
  );
}

function OperationalCard({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <AdminCard className="p-5">
      <h2 className="text-sm font-semibold text-charcoal-deep">{title}</h2>
      <dl className="mt-4 space-y-3">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3">
            <dt className="text-sm text-charcoal-soft">{label}</dt>
            <dd className="text-sm font-semibold text-charcoal-deep">{value}</dd>
          </div>
        ))}
      </dl>
    </AdminCard>
  );
}

function DistributionCard({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ label: string; value: number; display: string }>;
}) {
  const maxValue = Math.max(1, ...rows.map((row) => row.value));

  return (
    <AdminCard className="p-5">
      <h2 className="text-sm font-semibold text-charcoal-deep">{title}</h2>
      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-charcoal-soft">표시할 데이터가 없습니다.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="space-y-1.5">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="truncate text-charcoal-muted">{row.label}</span>
                <span className="shrink-0 font-semibold text-charcoal-deep">{row.display}</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-charcoal/10">
                <div
                  className="h-full rounded-full bg-primary-a11y"
                  style={{ width: `${Math.max(6, (row.value / maxValue) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

function SortableTh({
  label,
  sortKey,
  activeSortKey,
  sortDir,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: SortKey;
  activeSortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
  align?: 'left' | 'right';
}) {
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : 'text-left'}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center rounded-sm hover:text-charcoal-deep focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-a11y/25"
      >
        {label}
        {sortIndicator(activeSortKey, sortDir, sortKey)}
      </button>
    </th>
  );
}

function BuyerRow({ buyer, index }: { buyer: ExhibitionBuyerAnalyticsRow; index: number }) {
  return (
    <tr className="hover:bg-charcoal/5">
      <td className="px-4 py-3 font-medium text-charcoal-muted">{index + 1}</td>
      <td className="px-4 py-3 font-medium text-charcoal-deep">{buyer.buyerName}</td>
      <td className="px-4 py-3 text-charcoal-muted">{buyer.buyerPhone || '-'}</td>
      <td className="px-4 py-3 text-right text-charcoal-muted">
        {numberFormatter.format(buyer.purchaseCount)}점
      </td>
      <td className="px-4 py-3 text-right text-charcoal-muted">
        {numberFormatter.format(buyer.artworkCount)}
      </td>
      <td className="px-4 py-3 text-right text-charcoal-muted">{formatChannels(buyer.channels)}</td>
      <td className="max-w-[220px] px-4 py-3 text-right text-charcoal-muted">
        {buyer.deliverySummary}
      </td>
      <td className="px-4 py-3 text-right text-charcoal-muted">
        {formatDate(buyer.lastPurchaseDate)}
      </td>
      <td className="px-4 py-3 text-right font-semibold text-charcoal-deep">
        {krwFormatter.format(buyer.revenue)}
      </td>
    </tr>
  );
}
