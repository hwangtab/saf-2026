import Link from 'next/link';
import { getRevenueAnalytics } from '@/app/actions/admin-revenue';
import {
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { RevenueCard } from '@/app/admin/_components/RevenueCard';
import { RevenueFilterBar } from '@/app/admin/revenue/_components/RevenueFilterBar';
import { MonthlyRevenueChart } from '@/app/admin/revenue/_components/RevenueCharts';
import { getServerLocale } from '@/lib/server-locale';

const REVENUE_COPY = {
  ko: {
    title: '매출 현황',
    description: '판매 완료일이 확인된 기록만 인식매출로 집계합니다 (KST 기준).',
    selectedYear: '조회 연도',
    accountingCsv: '회계 템플릿 CSV',
    reportCsv: '분석 리포트 CSV',
    dataWarningTitle: '데이터 점검 필요',
    dataWarningDescPrefix: '판매 완료일이 누락된 기록이',
    dataWarningDescSuffix: '건 있습니다. 현재 인식매출 집계에서는 제외됩니다.',
    monthlyRevenue: '인식매출',
    soldCount: '판매수량',
    offlineRevenue: '오프라인 매출',
    onlineRevenue: '온라인 매출',
    avgPrice: '평균단가',
    ytdRevenue: '누계 인식매출 (YTD)',
    cumulativeSold: '누적 판매수량',
    compareRevenue: '비교 기준 인식매출',
    compareBase: '기준',
    onlineShare: '온라인 매출 비중',
    quantityShare: '수량 비중',
    previousMonthBase: '전월 기준',
    previousYearBase: '전년동월 기준',
    monthlyDetail: '월별 회계 상세',
    monthlyDetailSub: '1월 ~ 12월 인식매출 (KST 기준)',
    month: '월',
    currentRevenue: '당월 인식매출',
    offlineCount: '오프라인 수량',
    onlineCount: '온라인 수량',
    mom: 'MoM',
    yoy: 'YoY',
    prevMonthRevenue: '전월 매출',
    prevYearRevenue: '전년동월 매출',
    ytd: '누계 YTD',
    topArtists: '작가별 인식매출 TOP',
    topArtworks: '작품별 인식매출 TOP',
    noRevenueData: '매출 데이터 없음',
    noRevenueDataDesc: '해당 기간 매출 데이터가 없습니다.',
    loadErrorTitle: '매출 현황 로딩 오류',
    loadErrorMessage: '데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    pointsUnit: '점',
    yearSuffix: '년',
  },
  en: {
    title: 'Revenue Analytics',
    description: 'Only records with confirmed sold dates are counted as recognized revenue (KST).',
    selectedYear: 'Selected year',
    accountingCsv: 'Accounting CSV',
    reportCsv: 'Report CSV',
    dataWarningTitle: 'Data Check Required',
    dataWarningDescPrefix: 'Records missing sold completion dates:',
    dataWarningDescSuffix: 'These are excluded from recognized revenue calculations.',
    monthlyRevenue: 'Recognized Revenue',
    soldCount: 'Sold count',
    offlineRevenue: 'Offline Revenue',
    onlineRevenue: 'Online Revenue',
    avgPrice: 'Average Price',
    ytdRevenue: 'Recognized Revenue (YTD)',
    cumulativeSold: 'Cumulative sold count',
    compareRevenue: 'Comparison Baseline Revenue',
    compareBase: 'baseline',
    onlineShare: 'Online Revenue Share',
    quantityShare: 'Quantity share',
    previousMonthBase: 'vs previous month',
    previousYearBase: 'vs same month last year',
    monthlyDetail: 'Monthly Accounting Details',
    monthlyDetailSub: 'Jan-Dec recognized revenue (KST)',
    month: 'Month',
    currentRevenue: 'Current Recognized Revenue',
    offlineCount: 'Offline Count',
    onlineCount: 'Online Count',
    mom: 'MoM',
    yoy: 'YoY',
    prevMonthRevenue: 'Previous Month Revenue',
    prevYearRevenue: 'Previous Year Same Month',
    ytd: 'YTD',
    topArtists: 'Top Artists by Revenue',
    topArtworks: 'Top Artworks by Revenue',
    noRevenueData: 'No revenue data',
    noRevenueDataDesc: 'No revenue data available for this period.',
    loadErrorTitle: 'Revenue Page Load Error',
    loadErrorMessage: 'Failed to load data. Please try again shortly.',
    pointsUnit: 'items',
    yearSuffix: '',
  },
} as const;

type Props = {
  searchParams: Promise<{
    year?: string;
    month?: string;
  }>;
};

export const dynamic = 'force-dynamic';

function formatChangeRate(changeRate: number | null) {
  if (changeRate === null) return 'N/A';
  return `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(1)}%`;
}

function getChangeRateClass(changeRate: number | null) {
  if (changeRate === null) return 'text-slate-500';
  return changeRate >= 0 ? 'text-green-600' : 'text-red-600';
}

function formatShare(value: number | null) {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export default async function AdminRevenuePage({ searchParams }: Props) {
  const locale = await getServerLocale();
  const copy = REVENUE_COPY[locale];
  const krwFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  });
  const numberFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR');
  const params = await searchParams;

  let analytics;
  try {
    analytics = await getRevenueAnalytics({
      year: params.year,
      month: params.month,
    });
  } catch (error) {
    console.error('Revenue Analytics Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800">{copy.loadErrorTitle}</h2>
          <p className="mt-2 text-sm text-red-600">{copy.loadErrorMessage}</p>
        </div>
      </div>
    );
  }

  const summaryTrend =
    analytics.summary.changeRatePct === null
      ? undefined
      : {
          value: analytics.summary.changeRatePct,
          isPositive: analytics.summary.changeRatePct >= 0,
        };
  const selectedMonthToken =
    analytics.filter.selectedMonth === 'all' ? 'all' : String(analytics.filter.selectedMonth);
  const accountingExportHref = `/admin/revenue/export?year=${analytics.filter.selectedYear}&month=${selectedMonthToken}&format=accounting`;
  const reportExportHref = `/admin/revenue/export?year=${analytics.filter.selectedYear}&month=${selectedMonthToken}&format=report`;
  const sourceSummary = analytics.summaryBySource;
  const channelSummary = analytics.summaryByChannel;

  return (
    <div className="space-y-8">
      <AdminPageHeader>
        <AdminPageTitle>{copy.title}</AdminPageTitle>
        <AdminPageDescription>{copy.description}</AdminPageDescription>
        <p className="text-xs text-slate-500">
          {copy.selectedYear}: {analytics.filter.selectedYear}
          {copy.yearSuffix}
        </p>
      </AdminPageHeader>

      <RevenueFilterBar
        selectedYear={analytics.filter.selectedYear}
        selectedMonth={analytics.filter.selectedMonth}
        availableYears={analytics.filter.availableYears}
      />
      <div className="flex flex-wrap justify-end gap-2">
        <a
          href={accountingExportHref}
          className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          {copy.accountingCsv}
        </a>
        <a
          href={reportExportHref}
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          {copy.reportCsv}
        </a>
      </div>

      {analytics.dataQuality.soldWithoutSoldAtCount > 0 ? (
        <AdminCard className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{copy.dataWarningTitle}</p>
          <p className="mt-1 text-sm text-amber-800">
            {copy.dataWarningDescPrefix}{' '}
            {numberFormatter.format(analytics.dataQuality.soldWithoutSoldAtCount)}.{' '}
            {copy.dataWarningDescSuffix}
          </p>
        </AdminCard>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${copy.monthlyRevenue}`}
          value={analytics.summary.totalRevenue}
          subtitle={`${copy.soldCount}: ${numberFormatter.format(analytics.summary.soldCount)} ${copy.pointsUnit}`}
          trend={summaryTrend}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${copy.offlineRevenue}`}
          value={channelSummary.offline.revenue}
          subtitle={`${copy.offlineCount}: ${numberFormatter.format(channelSummary.offline.soldCount)} ${copy.pointsUnit}`}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${copy.onlineRevenue}`}
          value={channelSummary.online.revenue}
          subtitle={`${copy.onlineCount}: ${numberFormatter.format(channelSummary.online.soldCount)} ${copy.pointsUnit}`}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${copy.avgPrice}`}
          value={analytics.summary.averagePrice}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <RevenueCard
          title={`${analytics.filter.selectedYear}${copy.yearSuffix} ${copy.ytdRevenue}`}
          value={analytics.yearly.totalRevenue}
          subtitle={`${copy.cumulativeSold}: ${numberFormatter.format(analytics.yearly.soldCount)} ${copy.pointsUnit}`}
        />
        <RevenueCard
          title={copy.compareRevenue}
          value={analytics.summary.comparedToRevenue}
          subtitle={`${analytics.summary.comparedToLabel} ${copy.compareBase}`}
        />
        <AdminCard className="flex h-full flex-col justify-between p-6">
          <div>
            <p className="text-sm font-medium text-slate-500">{copy.onlineShare}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {formatShare(channelSummary.onlineRevenueSharePct)}
            </p>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {copy.quantityShare}: {formatShare(channelSummary.onlineSoldSharePct)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {copy.offlineRevenue} {krwFormatter.format(sourceSummary.manual.revenue)} /{' '}
            {copy.onlineRevenue} {krwFormatter.format(sourceSummary.cafe24.revenue)}
          </p>
        </AdminCard>
      </div>

      {analytics.focusMonth ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AdminCard className="p-6">
            <p className="text-sm font-medium text-slate-500">
              {analytics.filter.selectedYear}년 {analytics.focusMonth.month}월 전월 기준
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {krwFormatter.format(analytics.focusMonth.previousMonthRevenue)}
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${getChangeRateClass(analytics.focusMonth.momChangeRatePct)}`}
            >
              {formatChangeRate(analytics.focusMonth.momChangeRatePct)}
            </p>
          </AdminCard>
          <AdminCard className="p-6">
            <p className="text-sm font-medium text-slate-500">
              {analytics.filter.selectedYear}년 {analytics.focusMonth.month}월 전년동월 기준
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {krwFormatter.format(analytics.focusMonth.previousYearRevenue)}
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${getChangeRateClass(analytics.focusMonth.yoyChangeRatePct)}`}
            >
              {formatChangeRate(analytics.focusMonth.yoyChangeRatePct)}
            </p>
          </AdminCard>
        </div>
      ) : null}

      <MonthlyRevenueChart data={analytics.chart} />

      <AdminCard className="overflow-hidden">
        <AdminCardHeader className="rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-900">월별 회계 상세</h2>
          <span className="text-sm text-slate-500">1월 ~ 12월 인식매출 (KST 기준)</span>
        </AdminCardHeader>
        <div className="max-h-[460px] overflow-x-auto overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left">월</th>
                <th className="px-4 py-3 text-right">당월 인식매출</th>
                <th className="px-4 py-3 text-right">오프라인 매출</th>
                <th className="px-4 py-3 text-right">온라인 매출</th>
                <th className="px-4 py-3 text-right">오프라인 수량</th>
                <th className="px-4 py-3 text-right">온라인 수량</th>
                <th className="px-4 py-3 text-right">판매수량</th>
                <th className="px-4 py-3 text-right">평균단가</th>
                <th className="px-4 py-3 text-right">전월 매출</th>
                <th className="px-4 py-3 text-right">MoM</th>
                <th className="px-4 py-3 text-right">전년동월 매출</th>
                <th className="px-4 py-3 text-right">YoY</th>
                <th className="px-4 py-3 text-right">누계 YTD</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white text-sm">
              {analytics.monthly.map((month) => {
                const isSelected =
                  analytics.filter.selectedMonth !== 'all' &&
                  analytics.filter.selectedMonth === month.month;

                return (
                  <tr key={month.month} className={isSelected ? 'bg-indigo-50/50' : ''}>
                    <td className="px-4 py-3 font-medium text-slate-800">{month.label}</td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {krwFormatter.format(month.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {krwFormatter.format(month.offlineRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {krwFormatter.format(month.onlineRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(month.offlineSoldCount)} {copy.pointsUnit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(month.onlineSoldCount)} {copy.pointsUnit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(month.soldCount)} {copy.pointsUnit}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {krwFormatter.format(month.averagePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {krwFormatter.format(month.previousMonthRevenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${getChangeRateClass(month.momChangeRatePct)}`}
                    >
                      {formatChangeRate(month.momChangeRatePct)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {krwFormatter.format(month.previousYearRevenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${getChangeRateClass(month.yoyChangeRatePct)}`}
                    >
                      {formatChangeRate(month.yoyChangeRatePct)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-700">
                      {krwFormatter.format(month.cumulativeRevenue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </AdminCard>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">작가별 인식매출 TOP</h2>
            <span className="text-xs text-slate-500">{analytics.summary.periodLabel} 기준</span>
          </AdminCardHeader>
          <div className="p-0">
            {analytics.topArtists.length === 0 ? (
              <AdminEmptyState
                title="매출 데이터 없음"
                description="해당 기간 매출 데이터가 없습니다."
              />
            ) : (
              <ol className="divide-y divide-gray-100">
                {analytics.topArtists.map((artist, index) => (
                  <li
                    key={`${artist.artistId || 'unknown'}-${index}`}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {index + 1}. {artist.artistName}
                      </p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {copy.soldCount} {numberFormatter.format(artist.soldCount)}{' '}
                        {copy.pointsUnit}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-slate-900">
                      {krwFormatter.format(artist.revenue)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">작품별 인식매출 TOP</h2>
            <span className="text-xs text-slate-500">{analytics.summary.periodLabel} 기준</span>
          </AdminCardHeader>
          <div className="p-0">
            {analytics.topArtworks.length === 0 ? (
              <AdminEmptyState
                title="매출 데이터 없음"
                description="해당 기간 매출 데이터가 없습니다."
              />
            ) : (
              <ul className="divide-y divide-gray-100">
                {analytics.topArtworks.map((artwork) => (
                  <li key={artwork.artworkId} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/artworks/${artwork.artworkId}`}
                          className="block truncate text-sm font-medium text-slate-900 hover:text-indigo-700"
                        >
                          {artwork.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {artwork.artistName} · 판매일 {artwork.soldAtKst}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-slate-900">
                        {krwFormatter.format(artwork.revenue)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>
      </section>
    </div>
  );
}
