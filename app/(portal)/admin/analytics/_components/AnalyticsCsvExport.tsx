'use client';

import { useCallback } from 'react';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { csvSafeCell } from '@/lib/utils/csv';

type Props = {
  data: AnalyticsData;
};

export function AnalyticsCsvExport({ data }: Props) {
  const handleExport = useCallback(() => {
    const lines: string[] = [];

    // 요약
    lines.push('=== 요약 ===');
    lines.push('항목,값');
    lines.push(`총 페이지뷰,${data.summary.totalPageViews}`);
    lines.push(`순 방문자,${data.summary.uniqueVisitors}`);
    lines.push(`방문자당 평균 뷰,${data.summary.avgViewsPerVisitor}`);
    lines.push('');

    // 일별 추이
    lines.push('=== 일별 추이 ===');
    lines.push('날짜,페이지뷰,방문자');
    for (const row of data.dailyTrend) {
      lines.push(`${row.date},${row.views},${row.visitors}`);
    }
    lines.push('');

    // 인기 페이지
    lines.push('=== 인기 페이지 ===');
    lines.push('경로,페이지뷰,방문자');
    for (const row of data.topPages) {
      lines.push(`${csvSafeCell(row.path)},${csvSafeCell(row.views)},${csvSafeCell(row.visitors)}`);
    }
    lines.push('');

    // 디바이스
    lines.push('=== 디바이스 분포 ===');
    lines.push('유형,수');
    for (const row of data.deviceDistribution) {
      lines.push(`${csvSafeCell(row.type)},${csvSafeCell(row.count)}`);
    }
    lines.push('');

    // 국가
    lines.push('=== 국가 분포 ===');
    lines.push('국가,페이지뷰,방문자');
    for (const row of data.countryDistribution) {
      lines.push(
        `${csvSafeCell(row.country)},${csvSafeCell(row.views)},${csvSafeCell(row.visitors)}`
      );
    }
    lines.push('');

    // 브라우저
    lines.push('=== 브라우저 분포 ===');
    lines.push('브라우저,수');
    for (const row of data.browserDistribution) {
      lines.push(`${csvSafeCell(row.browser)},${csvSafeCell(row.count)}`);
    }
    lines.push('');

    // OS
    lines.push('=== OS 분포 ===');
    lines.push('OS,수');
    for (const row of data.osDistribution) {
      lines.push(`${csvSafeCell(row.os)},${csvSafeCell(row.count)}`);
    }
    lines.push('');

    // 시간대별
    lines.push('=== 시간대별 방문 ===');
    lines.push('시간,페이지뷰,방문자');
    for (const row of data.hourlyDistribution) {
      lines.push(`${row.hour}시,${row.views},${row.visitors}`);
    }
    lines.push('');

    // 유입 경로
    lines.push('=== 유입 경로 ===');
    lines.push('소스,수');
    for (const row of data.topReferrers) {
      lines.push(`${csvSafeCell(row.referrer)},${csvSafeCell(row.count)}`);
    }

    const bom = '\uFEFF';
    const csv = bom + lines.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saf2026-analytics-${data.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  return (
    <button
      type="button"
      onClick={handleExport}
      className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      CSV 내보내기
    </button>
  );
}
