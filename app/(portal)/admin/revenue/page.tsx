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
    buyerName?: string;
    buyerPhone?: string;
    artistId?: string;
  }>;
};

export const dynamic = 'force-dynamic';

function formatChangeRate(changeRate: number | null) {
  if (changeRate === null) return 'N/A';
  return `${changeRate >= 0 ? '+' : ''}${changeRate.toFixed(1)}%`;
}

function getChangeRateClass(changeRate: number | null) {
  if (changeRate === null) return 'text-gray-500';
  return changeRate >= 0 ? 'text-success-a11y' : 'text-danger-a11y';
}

function formatShare(value: number | null) {
  if (value === null) return 'N/A';
  return `${value.toFixed(1)}%`;
}

function formatDateTime(iso: string, locale: string) {
  return new Intl.DateTimeFormat(locale === 'en' ? 'en-US' : 'ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

function getRevenueHref(
  current: {
    year: number;
    month: number | 'all';
    buyerName?: string | null;
    buyerPhone?: string | null;
    artistId?: string | null;
  },
  next: {
    month?: number | 'all';
    buyerName?: string | null;
    buyerPhone?: string | null;
    artistId?: string | null;
  }
) {
  const params = new URLSearchParams();
  params.set('year', String(current.year));
  params.set('month', String(next.month ?? current.month));

  const buyerName = next.buyerName === undefined ? current.buyerName : next.buyerName;
  const buyerPhone = next.buyerPhone === undefined ? current.buyerPhone : next.buyerPhone;
  const artistId = next.artistId === undefined ? current.artistId : next.artistId;

  if (buyerName) params.set('buyerName', buyerName);
  if (buyerPhone) params.set('buyerPhone', buyerPhone);
  if (artistId) params.set('artistId', artistId);

  return `/admin/revenue?${params.toString()}`;
}

function formatChannelLabel(channel: 'offline' | 'online') {
  return channel === 'online' ? '온라인' : '오프라인';
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
      buyerName: params.buyerName,
      buyerPhone: params.buyerPhone,
      artistId: params.artistId,
    });
  } catch (error) {
    console.error('Revenue Analytics Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-danger/30 bg-danger/10 p-4">
          <h2 className="text-lg font-semibold text-danger-a11y">{t('loadErrorTitle')}</h2>
          <p className="mt-2 text-sm text-danger-a11y">{t('loadErrorMessage')}</p>
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
  const currentFilter = {
    year: analytics.filter.selectedYear,
    month: analytics.filter.selectedMonth,
    buyerName: analytics.filter.buyerName,
    buyerPhone: analytics.filter.buyerPhone,
    artistId: analytics.filter.artistId,
  };
  const hasDrilldownFilter =
    analytics.filter.selectedMonth !== 'all' ||
    !!analytics.filter.buyerName ||
    !!analytics.filter.artistId;
  const clearFilterHref = getRevenueHref(currentFilter, {
    month: 'all',
    buyerName: null,
    buyerPhone: null,
    artistId: null,
  });
  const detailRevenue = analytics.entries.reduce((sum, entry) => sum + entry.revenue, 0);
  const detailSoldCount = analytics.entries.reduce((sum, entry) => sum + entry.quantity, 0);

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

      {hasDrilldownFilter ? (
        <AdminCard className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-semibold text-gray-800">{t('activeFilters')}</span>
            {analytics.filter.selectedMonth !== 'all' ? (
              <span className="rounded-full bg-primary-surface px-3 py-1 font-medium text-primary-strong">
                {analytics.filter.selectedMonth}
                {t('month')}
              </span>
            ) : null}
            {analytics.filter.buyerName ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                {t('buyerColumn')}: {analytics.filter.buyerName}
                {analytics.filter.buyerPhone ? ` · ${analytics.filter.buyerPhone}` : ''}
              </span>
            ) : null}
            {analytics.filter.artistId ? (
              <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-700">
                {t('sellerColumn')}: {analytics.filter.artistId.startsWith('name:') ? analytics.filter.artistId.slice(5) : analytics.filter.artistId}
              </span>
            ) : null}
          </div>
          <Link
            href={clearFilterHref}
            className="text-sm font-semibold text-primary-strong hover:underline"
          >
            {t('clearFilters')}
          </Link>
        </AdminCard>
      ) : null}

      {analytics.dataQuality.soldWithoutSoldAtCount > 0 ? (
        <AdminCard className="border-charcoal-deep/20 bg-charcoal-deep/5 p-4">
          <p className="text-sm font-semibold text-charcoal-deep">{t('dataWarningTitle')}</p>
          <p className="mt-1 text-sm text-charcoal-deep">
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
                    <td className="px-4 py-3 font-medium">
                      <Link
                        href={getRevenueHref(currentFilter, {
                          month: month.month,
                          buyerName: null,
                          buyerPhone: null,
                          artistId: null,
                        })}
                        className="text-gray-900 hover:text-primary-strong hover:underline"
                      >
                        {month.label}
                      </Link>
                    </td>
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

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
                        {index + 1}.{' '}
                        <Link
                          href={getRevenueHref(currentFilter, {
                            buyerName: null,
                            buyerPhone: null,
                            artistId: artist.artistFilterId,
                          })}
                          className="hover:text-primary-strong hover:underline"
                        >
                          {artist.artistName}
                        </Link>
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
            <h2 className="text-base font-semibold text-gray-900">{t('topBuyers')}</h2>
            <span className="text-xs text-gray-500">
              {analytics.summary.periodLabel} {t('compareBase')}
            </span>
          </AdminCardHeader>
          <div className="p-0">
            {analytics.topBuyers.length === 0 ? (
              <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
            ) : (
              <ol className="divide-y divide-gray-100">
                {analytics.topBuyers.map((buyer, index) => (
                  <li
                    key={`${buyer.buyerName}-${buyer.buyerPhone || 'no-phone'}-${index}`}
                    className="flex items-center justify-between gap-4 p-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {index + 1}.{' '}
                        <Link
                          href={getRevenueHref(currentFilter, {
                            buyerName: buyer.buyerName,
                            buyerPhone: buyer.buyerPhone,
                            artistId: null,
                          })}
                          className="hover:text-primary-strong hover:underline"
                        >
                          {buyer.buyerName}
                        </Link>
                      </p>
                      <p className="mt-0.5 text-xs text-gray-500">
                        {buyer.buyerPhone || t('noBuyerPhone')} · {t('soldCount')}{' '}
                        {numberFormatter.format(buyer.soldCount)} {t('pointsUnit')} ·{' '}
                        {t('purchaseCount')} {numberFormatter.format(buyer.purchaseCount)}
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold text-gray-900">
                      {krwFormatter.format(buyer.revenue)}
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

      <AdminCard className="overflow-hidden">
        <AdminCardHeader className="rounded-t-2xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{t('detailEvidenceTitle')}</h2>
            <p className="mt-1 text-xs text-gray-500">{t('detailEvidenceDesc')}</p>
          </div>
          <div className="text-right text-xs text-gray-500">
            <p>
              {numberFormatter.format(analytics.entries.length)}
              {t('entriesUnit')} · {numberFormatter.format(detailSoldCount)} {t('pointsUnit')}
            </p>
            <p className="font-semibold text-gray-900">{krwFormatter.format(detailRevenue)}</p>
          </div>
        </AdminCardHeader>
        {analytics.entries.length === 0 ? (
          <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
        ) : (
          <div className="max-h-[520px] overflow-x-auto overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-xs font-semibold uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">{t('soldDate')}</th>
                  <th className="px-4 py-3 text-left">{t('buyerColumn')}</th>
                  <th className="px-4 py-3 text-left">{t('sellerColumn')}</th>
                  <th className="px-4 py-3 text-left">{t('artworkColumn')}</th>
                  <th className="px-4 py-3 text-right">{t('quantityColumn')}</th>
                  <th className="px-4 py-3 text-right">{t('unitPriceColumn')}</th>
                  <th className="px-4 py-3 text-right">{t('revenueColumn')}</th>
                  <th className="px-4 py-3 text-left">{t('channelColumn')}</th>
                  <th className="px-4 py-3 text-left">{t('orderColumn')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {analytics.entries.map((entry) => (
                  <tr key={entry.saleId} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatDateTime(entry.soldAtUtc, locale)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {entry.buyerName ? (
                        <Link
                          href={getRevenueHref(currentFilter, {
                            buyerName: entry.buyerName,
                            buyerPhone: entry.buyerPhone,
                            artistId: null,
                          })}
                          className="font-medium text-gray-900 hover:text-primary-strong hover:underline"
                        >
                          {entry.buyerName}
                        </Link>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                      <p className="mt-0.5 text-xs text-gray-500">
                        {entry.buyerPhone || t('noBuyerPhone')}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={getRevenueHref(currentFilter, {
                          buyerName: null,
                          buyerPhone: null,
                          artistId: entry.artistFilterId,
                        })}
                        className="font-medium text-gray-900 hover:text-primary-strong hover:underline"
                      >
                        {entry.artistName}
                      </Link>
                    </td>
                    <td className="max-w-[240px] px-4 py-3">
                      <Link
                        href={`/admin/artworks/${entry.artworkId}`}
                        className="line-clamp-2 font-medium text-gray-900 hover:text-primary-strong hover:underline"
                      >
                        {entry.title}
                      </Link>
                      <p className="mt-0.5 truncate font-mono text-[10px] text-gray-400">
                        {entry.artworkId}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {numberFormatter.format(entry.quantity)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">
                      {krwFormatter.format(entry.unitPrice)}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold text-gray-900">
                      {krwFormatter.format(entry.revenue)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {formatChannelLabel(entry.channel)}
                      {entry.sourceDetail ? (
                        <p className="mt-0.5 text-xs text-gray-500">{entry.sourceDetail}</p>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-700">
                      {entry.orderId ? (
                        <Link
                          href={`/admin/orders/${entry.orderId}`}
                          className="font-medium text-gray-900 hover:text-primary-strong hover:underline"
                        >
                          {entry.orderNo || entry.orderId}
                        </Link>
                      ) : (
                        <span>{entry.externalOrderId || '-'}</span>
                      )}
                      {entry.orderId && entry.externalOrderId ? (
                        <p className="mt-0.5 text-xs text-gray-500">{entry.externalOrderId}</p>
                      ) : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
}
