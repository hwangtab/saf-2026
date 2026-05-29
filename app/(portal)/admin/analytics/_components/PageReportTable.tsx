'use client';

import { useMemo, useState } from 'react';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

/**
 * GA4 페이지 보고서 표 — 클라이언트 측 정렬 토글.
 *
 * server에서 받은 데이터(default 조회수 desc)를 클라이언트에서 5가지 기준 정렬로
 * 재배열. server-side 정렬은 URL param + redirect 필요해 무거움. 30 rows 이하라
 * 클라이언트 정렬이 충분히 빠르고 UX 즉각.
 */

type Row = AnalyticsData['pageReport'][number];
type SortKey =
  | 'screenPageViews'
  | 'activeUsers'
  | 'viewsPerUser'
  | 'avgEngagementSeconds'
  | 'eventCount';

interface Props {
  data: Row[];
  /** i18n 라벨 — server에서 t() 후 prop으로 전달 (client는 next-intl/server 사용 못 함). */
  labels: {
    rankColumn: string;
    titleColumn: string;
    viewsColumn: string;
    usersColumn: string;
    viewsPerUserColumn: string;
    engagementColumn: string;
    eventsColumn: string;
    sortBy: string;
  };
  intlLocale: string;
  /** Date·duration 포맷 함수 결과를 직접 넣지 않고 보조 정보만 — locale은 client에서 해석. */
}

function formatDuration(seconds: number, intlLocale: string): string {
  const isEn = intlLocale.startsWith('en');
  if (seconds <= 0) return isEn ? '0s' : '0초';
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return isEn ? `${secs}s` : `${secs}초`;
  return isEn ? `${mins}m ${secs}s` : `${mins}분 ${secs}초`;
}

function getEngagementClass(seconds: number): string {
  if (seconds < 60) return 'text-gray-500';
  if (seconds < 300) return 'text-gray-700';
  if (seconds < 600) return 'text-primary-strong font-medium';
  return 'text-success-a11y font-semibold';
}

export default function PageReportTable({ data, labels, intlLocale }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('screenPageViews');

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => b[sortKey] - a[sortKey]);
  }, [data, sortKey]);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(intlLocale), [intlLocale]);
  const decimalFormatter = useMemo(
    () => new Intl.NumberFormat(intlLocale, { maximumFractionDigits: 2 }),
    [intlLocale]
  );

  // 정렬 기준 컬럼의 1위를 100% 기준으로 progress bar.
  const maxValue = sorted.length > 0 ? Math.max(...sorted.map((r) => r[sortKey] as number), 1) : 1;

  const sortOptions: Array<{ key: SortKey; label: string }> = [
    { key: 'screenPageViews', label: labels.viewsColumn },
    { key: 'activeUsers', label: labels.usersColumn },
    { key: 'viewsPerUser', label: labels.viewsPerUserColumn },
    { key: 'avgEngagementSeconds', label: labels.engagementColumn },
    { key: 'eventCount', label: labels.eventsColumn },
  ];

  return (
    <>
      {/* 정렬 토글 — 5개 칩 형식 */}
      <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 bg-white px-4 py-3">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {labels.sortBy}
        </span>
        {sortOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setSortKey(opt.key)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              sortKey === opt.key
                ? 'border-primary-strong bg-primary-strong text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="max-h-[640px] overflow-auto">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 z-10 bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
            <tr>
              <th className="w-10 px-2 py-2 text-center">{labels.rankColumn}</th>
              <th className="px-4 py-2 text-left">{labels.titleColumn}</th>
              <th className="px-4 py-2 text-left min-w-[160px]">
                {sortKey === 'screenPageViews' ? `▼ ${labels.viewsColumn}` : labels.viewsColumn}
              </th>
              <th className="px-4 py-2 text-right">
                {sortKey === 'activeUsers' ? `▼ ${labels.usersColumn}` : labels.usersColumn}
              </th>
              <th className="px-4 py-2 text-right">
                {sortKey === 'viewsPerUser'
                  ? `▼ ${labels.viewsPerUserColumn}`
                  : labels.viewsPerUserColumn}
              </th>
              <th className="px-4 py-2 text-right">
                {sortKey === 'avgEngagementSeconds'
                  ? `▼ ${labels.engagementColumn}`
                  : labels.engagementColumn}
              </th>
              <th className="px-4 py-2 text-right">
                {sortKey === 'eventCount' ? `▼ ${labels.eventsColumn}` : labels.eventsColumn}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {sorted.map((row, idx) => {
              const rank = idx + 1;
              const currentValue = row[sortKey] as number;
              const ratio = (currentValue / maxValue) * 100;
              return (
                <tr key={`${row.pagePath}-${row.pageTitle}`}>
                  <td
                    className={`px-2 py-3 text-center tabular-nums text-xs ${rank <= 3 ? 'font-semibold text-charcoal-deep' : 'text-gray-400'}`}
                  >
                    {rank}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    <p className="font-medium text-gray-900 line-clamp-2 leading-tight">
                      {row.pageTitle}
                    </p>
                    <p className="mt-0.5 font-mono text-xs text-gray-500 line-clamp-1">
                      {row.pagePath}
                    </p>
                  </td>
                  {/* views — 정렬 기준일 때만 progress bar 적용 */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="tabular-nums font-semibold text-gray-900 min-w-[40px]">
                        {numberFormatter.format(row.screenPageViews)}
                      </span>
                      {sortKey === 'screenPageViews' && (
                        <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${ratio}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {numberFormatter.format(row.activeUsers)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {decimalFormatter.format(row.viewsPerUser)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right tabular-nums ${getEngagementClass(row.avgEngagementSeconds)}`}
                  >
                    {formatDuration(row.avgEngagementSeconds, intlLocale)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-600">
                    {numberFormatter.format(row.eventCount)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
