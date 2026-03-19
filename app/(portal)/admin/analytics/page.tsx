import { getAnalyticsData, type AnalyticsPeriod } from '@/app/actions/admin-analytics';
import {
  AdminCard,
  AdminCardHeader,
  AdminEmptyState,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { AnalyticsPeriodTabs } from './_components/AnalyticsPeriodTabs';
import {
  DailyViewsChart,
  TopPagesChart,
  DevicePieChart,
  BrowserOsChart,
  HourlyHeatmap,
  AnalyticsCsvExport,
} from './_components/AnalyticsCharts';
import { getTranslations, getLocale } from 'next-intl/server';

export const dynamic = 'force-dynamic';

const VALID_PERIODS: AnalyticsPeriod[] = ['7d', '30d', '90d'];

const COUNTRY_KEYS: Record<string, string> = {
  KR: 'countryKR',
  US: 'countryUS',
  JP: 'countryJP',
  CN: 'countryCN',
  TW: 'countryTW',
  HK: 'countryHK',
  DE: 'countryDE',
  FR: 'countryFR',
  GB: 'countryGB',
  CA: 'countryCA',
  AU: 'countryAU',
  SG: 'countrySG',
  unknown: 'countryUnknown',
};

function StatCard({
  title,
  value,
  subtitle,
  accent,
}: {
  title: string;
  value: string;
  subtitle?: string;
  accent?: boolean;
}) {
  return (
    <AdminCard className="p-6">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p
        className={`mt-2 text-3xl font-bold tracking-tight ${accent ? 'text-emerald-600' : 'text-slate-900'}`}
      >
        {value}
      </p>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </AdminCard>
  );
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminAnalyticsPage({ searchParams }: Props) {
  const locale = await getLocale();
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR');
  const params = await searchParams;
  const period: AnalyticsPeriod = VALID_PERIODS.includes(params.period as AnalyticsPeriod)
    ? (params.period as AnalyticsPeriod)
    : '30d';

  let data;
  try {
    data = await getAnalyticsData(period);
  } catch (error) {
    console.error('Analytics Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800">{t('loadErrorTitle')}</h2>
          <p className="mt-2 text-sm text-red-600">{t('loadErrorMessage')}</p>
        </div>
      </div>
    );
  }

  const periodLabel =
    period === '7d' ? t('period7d') : period === '90d' ? t('period90d') : t('period30d');

  const getCountryName = (code: string) => {
    const key = COUNTRY_KEYS[code];
    if (key) return t(key);
    return code;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>
            {t('title')}
            <AdminHelp>{t('titleHelp')}</AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>{t('description')}</AdminPageDescription>
        </AdminPageHeader>
        <div className="flex items-center gap-3">
          <AnalyticsCsvExport data={data} />
          <AnalyticsPeriodTabs selected={period} />
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <StatCard
          title={t('realtimeVisitors')}
          value={numberFormatter.format(data.realtime.activeVisitors)}
          subtitle={t('recentFiveMin')}
          accent
        />
        <StatCard
          title={`${t('totalPageViews')} (${periodLabel})`}
          value={numberFormatter.format(data.summary.totalPageViews)}
        />
        <StatCard
          title={`${t('uniqueVisitors')} (${periodLabel})`}
          value={numberFormatter.format(data.summary.uniqueVisitors)}
        />
        <StatCard
          title={t('avgViewsPerVisitor')}
          value={String(data.summary.avgViewsPerVisitor)}
          subtitle={t('avgFormula')}
        />
      </div>

      {/* 일별 추이 차트 */}
      <DailyViewsChart data={data.dailyTrend} />

      {/* 시간대별 방문 */}
      <HourlyHeatmap data={data.hourlyDistribution} />

      {/* 인기 페이지 + 디바이스 분포 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopPagesChart data={data.topPages} />
        <DevicePieChart data={data.deviceDistribution} />
      </div>

      {/* 브라우저 / OS 분포 */}
      <BrowserOsChart browserData={data.browserDistribution} osData={data.osDistribution} />

      {/* 국가 분포 + 유입 경로 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 국가 분포 테이블 */}
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{t('countryVisits')}</h2>
          </AdminCardHeader>
          <div className="p-0">
            {data.countryDistribution.length === 0 ? (
              <AdminEmptyState title={t('noCountryData')} description={t('noCountryDataDesc')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 font-medium text-slate-500">{t('country')}</th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {t('pageViews')}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {t('visitors')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.countryDistribution.map((item) => (
                      <tr key={item.country} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-700">{getCountryName(item.country)}</td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                          {numberFormatter.format(item.views)}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                          {numberFormatter.format(item.visitors)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>

        {/* 유입 경로 테이블 */}
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{t('referrer')}</h2>
          </AdminCardHeader>
          <div className="p-0">
            {data.topReferrers.length === 0 ? (
              <AdminEmptyState title={t('noReferrerData')} description={t('noReferrerDataDesc')} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 font-medium text-slate-500">{t('source')}</th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {t('visits')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.topReferrers.map((item) => (
                      <tr key={item.referrer} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-700 truncate max-w-[300px]">
                          {item.referrer}
                        </td>
                        <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                          {numberFormatter.format(item.count)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </AdminCard>
      </div>
    </div>
  );
}
