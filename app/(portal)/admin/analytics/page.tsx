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
import { getServerLocale } from '@/lib/server-locale';

export const dynamic = 'force-dynamic';

type LocaleCode = 'ko' | 'en';

const VALID_PERIODS: AnalyticsPeriod[] = ['7d', '30d', '90d'];

const COUNTRY_NAMES: Record<LocaleCode, Record<string, string>> = {
  ko: {
    KR: '한국',
    US: '미국',
    JP: '일본',
    CN: '중국',
    TW: '대만',
    HK: '홍콩',
    DE: '독일',
    FR: '프랑스',
    GB: '영국',
    CA: '캐나다',
    AU: '호주',
    SG: '싱가포르',
    unknown: '기타',
  },
  en: {
    KR: 'Korea',
    US: 'United States',
    JP: 'Japan',
    CN: 'China',
    TW: 'Taiwan',
    HK: 'Hong Kong',
    DE: 'Germany',
    FR: 'France',
    GB: 'United Kingdom',
    CA: 'Canada',
    AU: 'Australia',
    SG: 'Singapore',
    unknown: 'Other',
  },
};

const ANALYTICS_COPY = {
  ko: {
    loadErrorTitle: '분석 데이터 로딩 오류',
    loadErrorMessage: '데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    title: '사이트 분석',
    titleHelp:
      'Vercel Analytics Drain을 통해 수집된 페이지뷰 및 방문자 통계입니다. Drain 설정 이후의 데이터만 표시됩니다.',
    description: '사이트 방문자 통계와 인기 페이지를 확인합니다.',
    period7d: '7일',
    period30d: '30일',
    period90d: '90일',
    realtimeVisitors: '실시간 방문자',
    recentFiveMin: '최근 5분',
    totalPageViews: '총 페이지뷰',
    uniqueVisitors: '순 방문자',
    avgViewsPerVisitor: '방문자당 평균 뷰',
    avgFormula: '페이지뷰 / 순 방문자',
    countryVisits: '국가별 방문',
    noCountryData: '국가 데이터가 없습니다',
    noCountryDataDesc: '해당 기간의 국가별 방문 데이터가 없습니다.',
    country: '국가',
    pageViews: '페이지뷰',
    visitors: '방문자',
    referrer: '유입 경로 (Referrer)',
    noReferrerData: '유입 경로 데이터가 없습니다',
    noReferrerDataDesc: '해당 기간의 유입 경로 데이터가 없습니다.',
    source: '소스',
    visits: '방문 수',
  },
  en: {
    loadErrorTitle: 'Analytics Load Error',
    loadErrorMessage: 'Failed to load analytics data. Please try again shortly.',
    title: 'Site Analytics',
    titleHelp:
      'Pageview and visitor statistics collected through Vercel Analytics Drain. Only data after Drain setup is shown.',
    description: 'Review visitor trends and top-performing pages.',
    period7d: '7 days',
    period30d: '30 days',
    period90d: '90 days',
    realtimeVisitors: 'Realtime Visitors',
    recentFiveMin: 'Last 5 minutes',
    totalPageViews: 'Total Page Views',
    uniqueVisitors: 'Unique Visitors',
    avgViewsPerVisitor: 'Avg Views per Visitor',
    avgFormula: 'Page views / unique visitors',
    countryVisits: 'Visits by Country',
    noCountryData: 'No country data',
    noCountryDataDesc: 'No country-based visit data for this period.',
    country: 'Country',
    pageViews: 'Page Views',
    visitors: 'Visitors',
    referrer: 'Referrers',
    noReferrerData: 'No referrer data',
    noReferrerDataDesc: 'No referrer data for this period.',
    source: 'Source',
    visits: 'Visits',
  },
} as const;

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
  const locale = await getServerLocale();
  const copy = ANALYTICS_COPY[locale];
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
          <h2 className="text-lg font-semibold text-red-800">{copy.loadErrorTitle}</h2>
          <p className="mt-2 text-sm text-red-600">{copy.loadErrorMessage}</p>
        </div>
      </div>
    );
  }

  const periodLabel =
    period === '7d' ? copy.period7d : period === '90d' ? copy.period90d : copy.period30d;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>
            {copy.title}
            <AdminHelp>{copy.titleHelp}</AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>{copy.description}</AdminPageDescription>
        </AdminPageHeader>
        <div className="flex items-center gap-3">
          <AnalyticsCsvExport data={data} />
          <AnalyticsPeriodTabs selected={period} />
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <StatCard
          title={copy.realtimeVisitors}
          value={numberFormatter.format(data.realtime.activeVisitors)}
          subtitle={copy.recentFiveMin}
          accent
        />
        <StatCard
          title={`${copy.totalPageViews} (${periodLabel})`}
          value={numberFormatter.format(data.summary.totalPageViews)}
        />
        <StatCard
          title={`${copy.uniqueVisitors} (${periodLabel})`}
          value={numberFormatter.format(data.summary.uniqueVisitors)}
        />
        <StatCard
          title={copy.avgViewsPerVisitor}
          value={String(data.summary.avgViewsPerVisitor)}
          subtitle={copy.avgFormula}
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
            <h2 className="text-base font-semibold text-slate-900">{copy.countryVisits}</h2>
          </AdminCardHeader>
          <div className="p-0">
            {data.countryDistribution.length === 0 ? (
              <AdminEmptyState title={copy.noCountryData} description={copy.noCountryDataDesc} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 font-medium text-slate-500">{copy.country}</th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {copy.pageViews}
                      </th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {copy.visitors}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {data.countryDistribution.map((item) => (
                      <tr key={item.country} className="transition-colors hover:bg-slate-50">
                        <td className="px-6 py-3 text-slate-700">
                          {COUNTRY_NAMES[locale][item.country] || item.country}
                        </td>
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
            <h2 className="text-base font-semibold text-slate-900">{copy.referrer}</h2>
          </AdminCardHeader>
          <div className="p-0">
            {data.topReferrers.length === 0 ? (
              <AdminEmptyState title={copy.noReferrerData} description={copy.noReferrerDataDesc} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="px-6 py-3 font-medium text-slate-500">{copy.source}</th>
                      <th className="px-6 py-3 text-right font-medium text-slate-500">
                        {copy.visits}
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
