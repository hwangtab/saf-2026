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
import { getTranslations, getLocale } from 'next-intl/server';

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
  if (changeRate === null) return 'text-gray-500';
  return changeRate >= 0 ? 'text-green-600' : 'text-red-600';
}

function formatShare(value: number | null) {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

export default async function AdminRevenuePage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('admin.revenue');
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
          <h2 className="text-lg font-semibold text-red-800">{t('loadErrorTitle')}</h2>
          <p className="mt-2 text-sm text-red-600">{t('loadErrorMessage')}</p>
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
        <AdminPageTitle>{t('title')}</AdminPageTitle>
        <AdminPageDescription>{t('description')}</AdminPageDescription>
        <p className="text-xs text-gray-500">
          {t('selectedYear')}: {analytics.filter.selectedYear}
          {t('yearSuffix')}
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
          className="inline-flex items-center justify-center rounded-lg border border-primary-soft bg-primary-surface px-4 py-2 text-sm font-semibold text-primary-strong hover:bg-primary-soft"
        >
          {t('accountingCsv')}
        </a>
        <a
          href={reportExportHref}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          {t('reportCsv')}
        </a>
      </div>

      {analytics.dataQuality.soldWithoutSoldAtCount > 0 ? (
        <AdminCard className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">{t('dataWarningTitle')}</p>
          <p className="mt-1 text-sm text-amber-800">
            {t('dataWarningDescPrefix')}{' '}
            {numberFormatter.format(analytics.dataQuality.soldWithoutSoldAtCount)}.{' '}
            {t('dataWarningDescSuffix')}
          </p>
        </AdminCard>
      ) : null}

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${t('monthlyRevenue')}`}
          value={analytics.summary.totalRevenue}
          subtitle={`${t('soldCount')}: ${numberFormatter.format(analytics.summary.soldCount)} ${t('pointsUnit')}`}
          trend={summaryTrend}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${t('offlineRevenue')}`}
          value={channelSummary.offline.revenue}
          subtitle={`${t('offlineCount')}: ${numberFormatter.format(channelSummary.offline.soldCount)} ${t('pointsUnit')}`}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${t('onlineRevenue')}`}
          value={channelSummary.online.revenue}
          subtitle={`${t('onlineCount')}: ${numberFormatter.format(channelSummary.online.soldCount)} ${t('pointsUnit')}`}
        />
        <RevenueCard
          title={`${analytics.summary.periodLabel} ${t('avgPrice')}`}
          value={analytics.summary.averagePrice}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <RevenueCard
          title={`${analytics.filter.selectedYear}${t('yearSuffix')} ${t('ytdRevenue')}`}
          value={analytics.yearly.totalRevenue}
          subtitle={`${t('cumulativeSold')}: ${numberFormatter.format(analytics.yearly.soldCount)} ${t('pointsUnit')}`}
        />
        <RevenueCard
          title={t('compareRevenue')}
          value={analytics.summary.comparedToRevenue}
          subtitle={`${analytics.summary.comparedToLabel} ${t('compareBase')}`}
        />
        <AdminCard className="flex h-full flex-col justify-between p-6">
          <div>
            <p className="text-sm font-medium text-gray-500">{t('onlineShare')}</p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              {formatShare(channelSummary.onlineRevenueSharePct)}
            </p>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            {t('quantityShare')}: {formatShare(channelSummary.onlineSoldSharePct)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {t('offlineRevenue')} {krwFormatter.format(sourceSummary.manual.revenue)} /{' '}
            {t('onlineRevenue')} {krwFormatter.format(sourceSummary.toss.revenue)}
          </p>
        </AdminCard>
      </div>

      {analytics.focusMonth ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <AdminCard className="p-6">
            <p className="text-sm font-medium text-gray-500">
              {t('focusMonthPreviousMonth', {
                year: analytics.filter.selectedYear,
                month: analytics.focusMonth.month,
              })}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
              {krwFormatter.format(analytics.focusMonth.previousMonthRevenue)}
            </p>
            <p
              className={`mt-2 text-sm font-semibold ${getChangeRateClass(analytics.focusMonth.momChangeRatePct)}`}
            >
              {formatChangeRate(analytics.focusMonth.momChangeRatePct)}
            </p>
          </AdminCard>
          <AdminCard className="p-6">
            <p className="text-sm font-medium text-gray-500">
              {t('focusMonthPreviousYear', {
                year: analytics.filter.selectedYear,
                month: analytics.focusMonth.month,
              })}
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-gray-900">
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
          <h2 className="text-base font-semibold text-gray-900">{t('monthlyDetail')}</h2>
          <span className="text-sm text-gray-500">{t('monthlyDetailSub')}</span>
        </AdminCardHeader>
        <div className="max-h-[460px] overflow-x-auto overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left">{t('month')}</th>
                <th className="px-4 py-3 text-right">{t('currentRevenue')}</th>
                <th className="px-4 py-3 text-right">{t('offlineRevenue')}</th>
                <th className="px-4 py-3 text-right">{t('onlineRevenue')}</th>
                <th className="px-4 py-3 text-right">{t('offlineCount')}</th>
                <th className="px-4 py-3 text-right">{t('onlineCount')}</th>
                <th className="px-4 py-3 text-right">{t('soldCount')}</th>
                <th className="px-4 py-3 text-right">{t('avgPrice')}</th>
                <th className="px-4 py-3 text-right">{t('prevMonthRevenue')}</th>
                <th className="px-4 py-3 text-right">{t('mom')}</th>
                <th className="px-4 py-3 text-right">{t('prevYearRevenue')}</th>
                <th className="px-4 py-3 text-right">{t('yoy')}</th>
                <th className="px-4 py-3 text-right">{t('ytd')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white text-sm">
              {analytics.monthly.map((month) => {
                const isSelected =
                  analytics.filter.selectedMonth !== 'all' &&
                  analytics.filter.selectedMonth === month.month;

                return (
                  <tr key={month.month} className={isSelected ? 'bg-primary-surface/50' : ''}>
                    <td className="px-4 py-3 font-medium text-gray-800">{month.label}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {krwFormatter.format(month.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {krwFormatter.format(month.offlineRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {krwFormatter.format(month.onlineRevenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {numberFormatter.format(month.offlineSoldCount)} {t('pointsUnit')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {numberFormatter.format(month.onlineSoldCount)} {t('pointsUnit')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {numberFormatter.format(month.soldCount)} {t('pointsUnit')}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700">
                      {krwFormatter.format(month.averagePrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {krwFormatter.format(month.previousMonthRevenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${getChangeRateClass(month.momChangeRatePct)}`}
                    >
                      {formatChangeRate(month.momChangeRatePct)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {krwFormatter.format(month.previousYearRevenue)}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-semibold ${getChangeRateClass(month.yoyChangeRatePct)}`}
                    >
                      {formatChangeRate(month.yoyChangeRatePct)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-700">
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
            <h2 className="text-base font-semibold text-gray-900">{t('topArtists')}</h2>
            <span className="text-xs text-gray-500">
              {analytics.summary.periodLabel} {t('compareBase')}
            </span>
          </AdminCardHeader>
          <div className="p-0">
            {analytics.topArtists.length === 0 ? (
              <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
            ) : (
              <ol className="divide-y divide-gray-100">
                {analytics.topArtists.map((artist, index) => (
                  <li
                    key={`${artist.artistId || 'unknown'}-${index}`}
                    className="flex items-center justify-between p-4"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {index + 1}. {artist.artistName}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {t('soldCount')} {numberFormatter.format(artist.soldCount)}{' '}
                        {t('pointsUnit')}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
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
            <h2 className="text-base font-semibold text-gray-900">{t('topArtworks')}</h2>
            <span className="text-xs text-gray-500">
              {analytics.summary.periodLabel} {t('compareBase')}
            </span>
          </AdminCardHeader>
          <div className="p-0">
            {analytics.topArtworks.length === 0 ? (
              <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
            ) : (
              <ul className="divide-y divide-gray-100">
                {analytics.topArtworks.map((artwork) => (
                  <li key={artwork.artworkId} className="p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <Link
                          href={`/admin/artworks/${artwork.artworkId}`}
                          className="block truncate text-sm font-medium text-gray-900 hover:text-primary-strong"
                        >
                          {artwork.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-gray-500">
                          {artwork.artistName} · {t('soldDate')} {artwork.soldAtKst}
                        </p>
                      </div>
                      <p className="shrink-0 text-sm font-semibold text-gray-900">
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
