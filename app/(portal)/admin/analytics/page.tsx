import { getAnalyticsData, type AnalyticsPeriod } from '@/app/actions/admin-analytics';
import {
  AdminCard,
  AdminCardHeader,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { AnalyticsPeriodTabs } from './_components/AnalyticsPeriodTabs';
import { DailyViewsChart, TopPagesChart, DevicePieChart } from './_components/AnalyticsCharts';

export const dynamic = 'force-dynamic';

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

const VALID_PERIODS: AnalyticsPeriod[] = ['7d', '30d', '90d'];

function StatCard({ title, value, subtitle }: { title: string; value: string; subtitle?: string }) {
  return (
    <AdminCard className="p-6">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </AdminCard>
  );
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function AdminAnalyticsPage({ searchParams }: Props) {
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
          <h2 className="text-lg font-semibold text-red-800">분석 데이터 로딩 오류</h2>
          <p className="mt-2 text-sm text-red-600">
            데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.
          </p>
        </div>
      </div>
    );
  }

  const periodLabel = period === '7d' ? '7일' : period === '90d' ? '90일' : '30일';

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>
            사이트 분석
            <AdminHelp>
              Vercel Analytics Drain을 통해 수집된 페이지뷰 및 방문자 통계입니다. Drain 설정 이후의
              데이터만 표시됩니다.
            </AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>
            사이트 방문자 통계와 인기 페이지를 확인합니다.
          </AdminPageDescription>
        </AdminPageHeader>
        <AnalyticsPeriodTabs selected={period} />
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <StatCard
          title={`총 페이지뷰 (${periodLabel})`}
          value={NUMBER_FORMATTER.format(data.summary.totalPageViews)}
        />
        <StatCard
          title={`순 방문자 (${periodLabel})`}
          value={NUMBER_FORMATTER.format(data.summary.uniqueVisitors)}
        />
        <StatCard
          title="방문자당 평균 뷰"
          value={String(data.summary.avgViewsPerVisitor)}
          subtitle="페이지뷰 ÷ 순 방문자"
        />
      </div>

      {/* 일별 추이 차트 */}
      <DailyViewsChart data={data.dailyTrend} />

      {/* 인기 페이지 + 디바이스 분포 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopPagesChart data={data.topPages} />
        <DevicePieChart data={data.deviceDistribution} />
      </div>

      {/* 추천 소스 테이블 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-900">유입 경로 (Referrer)</h2>
        </AdminCardHeader>
        <div className="p-0">
          {data.topReferrers.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              유입 경로 데이터가 없습니다.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 font-medium text-slate-500">소스</th>
                    <th className="px-6 py-3 text-right font-medium text-slate-500">방문 수</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {data.topReferrers.map((item) => (
                    <tr key={item.referrer} className="transition-colors hover:bg-slate-50">
                      <td className="px-6 py-3 text-slate-700 truncate max-w-[300px]">
                        {item.referrer}
                      </td>
                      <td className="px-6 py-3 text-right tabular-nums text-slate-900">
                        {NUMBER_FORMATTER.format(item.count)}
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
  );
}
