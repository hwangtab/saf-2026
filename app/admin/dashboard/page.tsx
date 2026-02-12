import { getDashboardStats, type DashboardPeriodKey } from '@/app/actions/admin-dashboard';
import { connection } from 'next/server';
import Link from 'next/link';
import {
  AdminCard,
  AdminCardHeader,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
} from '@/app/admin/_components/admin-ui';
import { RevenueCard } from '@/app/admin/_components/RevenueCard';
import { StatusDonutChart } from '@/app/admin/_components/StatusDonutChart';
import { MaterialBarChart } from '@/app/admin/_components/MaterialBarChart';
import { TrendLineChart } from '@/app/admin/_components/TrendLineChart';
import { RevenueTrendChart } from '@/app/admin/_components/RevenueTrendChart';
import { DashboardPeriodPreference } from '@/app/admin/_components/DashboardPeriodPreference';

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

const DASHBOARD_PERIOD_OPTIONS: Array<{ key: DashboardPeriodKey; label: string }> = [
  { key: '7d', label: '최근 7일' },
  { key: '30d', label: '최근 30일' },
  { key: '90d', label: '최근 90일' },
  { key: '365d', label: '최근 1년' },
  { key: 'all', label: '전체 기간' },
];

function isDashboardPeriodKey(value: string): value is DashboardPeriodKey {
  return DASHBOARD_PERIOD_OPTIONS.some((option) => option.key === value);
}

function StatCard({
  title,
  value,
  subtitle,
  href,
}: {
  title: string;
  value: number;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <AdminCard className="flex h-full flex-col justify-between p-6 transition-all duration-200">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{value}</p>
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
    </AdminCard>
  );

  if (href) {
    return (
      <Link href={href} className="block rounded-2xl hover:-translate-y-0.5 hover:shadow-md">
        {content}
      </Link>
    );
  }

  return content;
}

type Props = {
  searchParams: Promise<{
    period?: string;
  }>;
};

export const dynamic = 'force-dynamic';

function formatDate(dateString: string | null | undefined) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateString: string | null | undefined) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleDateString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
  });
}

function formatComparedTo(comparedTo: string | null) {
  if (!comparedTo) return '전체 기간은 비교 구간 없음';

  const [startRaw, endRaw] = comparedTo.split(' ~ ');
  const start = formatShortDate(startRaw);
  const end = formatShortDate(endRaw);

  if (!start || !end) return `비교 기간: ${comparedTo}`;
  return `비교 기간: ${start} ~ ${end}`;
}

export default async function AdminDashboardPage({ searchParams }: Props) {
  await connection();
  const params = await searchParams;
  const periodParam = params.period;
  const selectedPeriod: DashboardPeriodKey =
    periodParam && isDashboardPeriodKey(periodParam) ? periodParam : '30d';

  const stats = await getDashboardStats(selectedPeriod);

  const linkedRate =
    stats.artists.totalRegistered > 0
      ? Math.round((stats.artists.linkedAccounts / stats.artists.totalRegistered) * 100)
      : 0;

  const hiddenRate =
    stats.artworks.total > 0 ? Math.round((stats.artworks.hidden / stats.artworks.total) * 100) : 0;

  const periodTrend =
    stats.revenue.period.changeRatePct === null
      ? undefined
      : {
          value: stats.revenue.period.changeRatePct,
          isPositive: stats.revenue.period.changeRatePct >= 0,
        };

  return (
    <div className="space-y-8">
      <DashboardPeriodPreference selectedPeriod={selectedPeriod} />

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>대시보드</AdminPageTitle>
          <AdminPageDescription>
            SAF 2026 관리자 현황과 매출 지표를 기간별로 확인합니다.
          </AdminPageDescription>
          <p className="text-xs text-slate-500">
            조회 구간: {stats.period.startDate} ~ {stats.period.endDate}
          </p>
        </AdminPageHeader>
        <div className="flex flex-wrap gap-2">
          {DASHBOARD_PERIOD_OPTIONS.map((option) => {
            const isActive = option.key === selectedPeriod;
            return (
              <Link
                key={option.key}
                href={`/admin/dashboard?period=${option.key}`}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isActive
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
                }`}
              >
                {option.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="등록 작가(전체)"
          value={stats.artists.totalRegistered}
          subtitle={`계정 미연결: ${stats.artists.unlinkedAccounts}명`}
          href="/admin/artists"
        />
        <StatCard
          title="연결된 아티스트 계정"
          value={stats.artists.linkedAccounts}
          subtitle={`연결률: ${linkedRate}%`}
          href="/admin/users"
        />
        <StatCard
          title="아티스트 신청 대기"
          value={stats.artists.pendingApplications}
          subtitle={stats.artists.pendingApplications > 0 ? '확인 필요' : '대기 없음'}
          href="/admin/users"
        />
        <StatCard
          title="숨김 작품"
          value={stats.artworks.hidden}
          subtitle={`전체 작품 대비: ${hiddenRate}%`}
          href="/admin/artworks?visibility=hidden"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mt-8">
        <RevenueCard
          title={`${stats.period.label} 매출`}
          value={stats.revenue.period.totalRevenue}
          subtitle={`판매 완료: ${NUMBER_FORMATTER.format(stats.revenue.period.soldCount)}개`}
          trend={periodTrend}
        />
        <RevenueCard
          title={`${stats.period.label} 평균판매가`}
          value={stats.revenue.period.averagePrice}
          subtitle={formatComparedTo(stats.period.comparedTo)}
        />
        <RevenueCard
          title="누적 총 매출"
          value={stats.revenue.lifetime.totalRevenue}
          subtitle={`누적 판매: ${NUMBER_FORMATTER.format(stats.revenue.lifetime.soldCount)}개`}
        />
        <RevenueCard
          title="재고 가치(공개)"
          value={stats.revenue.lifetime.inventoryValue}
          subtitle="공개된 판매중/예약 작품의 합계"
        />
      </div>

      <div className="mt-8">
        <RevenueTrendChart
          data={stats.revenue.timeSeries}
          periodLabel={`${stats.period.startDate} ~ ${stats.period.endDate}`}
        />
      </div>

      <AdminCard className="overflow-hidden">
        <AdminCardHeader className="rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-900">기간별 매출 상세</h2>
          <span className="text-sm text-slate-500">
            총 {NUMBER_FORMATTER.format(stats.revenue.timeSeries.length)}개 구간
          </span>
        </AdminCardHeader>
        <div className="max-h-[380px] overflow-auto">
          {stats.revenue.timeSeries.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-500">
              표시할 매출 데이터가 없습니다.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">구간</th>
                  <th className="px-4 py-3 text-right">매출</th>
                  <th className="px-4 py-3 text-right">판매 수</th>
                  <th className="px-4 py-3 text-right">평균판매가</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {[...stats.revenue.timeSeries].reverse().map((bucket) => (
                  <tr key={bucket.bucketKey}>
                    <td className="px-4 py-3 text-slate-700">
                      {bucket.startDate} ~ {bucket.endDate}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {KRW_FORMATTER.format(bucket.revenue)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {NUMBER_FORMATTER.format(bucket.soldCount)}개
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {KRW_FORMATTER.format(bucket.averagePrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        <StatusDonutChart data={stats.artworks} />
        <MaterialBarChart data={stats.materialDistribution} />
      </div>

      <div className="mt-8">
        <TrendLineChart data={stats.trends} />
      </div>

      {/* 최근 활동 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2 mt-8">
        {/* 최근 가입 신청 */}
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">최근 가입 신청</h2>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              전체 보기
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentApplications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                대기 중인 신청이 없습니다.
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recentApplications.map((app) => (
                  <li key={app.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{app.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{app.email}</p>
                        <p className="text-xs text-gray-500">{app.contact}</p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {formatDate(app.created_at)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>

        {/* 최근 등록된 작품 */}
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">최근 등록된 작품</h2>
            <Link
              href="/admin/artworks"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              전체 보기
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentArtworks.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">등록된 작품이 없습니다.</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recentArtworks.map((artwork) => (
                  <li key={artwork.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <Link
                          href={`/admin/artworks/${artwork.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate max-w-[200px]"
                        >
                          {artwork.title}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{artwork.artist_name}</p>
                      </div>
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {formatDate(artwork.created_at)}
                      </span>
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
