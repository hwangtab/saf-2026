import { requireAdmin } from '@/lib/auth/guards';
import { getDashboardStats } from '@/app/actions/admin-dashboard';
import Link from 'next/link';
import { AdminCard, AdminCardHeader } from '@/app/admin/_components/admin-ui';
import { RevenueCard } from '@/app/admin/_components/RevenueCard';
import { StatusDonutChart } from '@/app/admin/_components/StatusDonutChart';
import { MaterialBarChart } from '@/app/admin/_components/MaterialBarChart';
import { TrendLineChart } from '@/app/admin/_components/TrendLineChart';

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

export default async function AdminDashboardPage() {
  await requireAdmin();
  const stats = await getDashboardStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">대시보드</h1>
        <p className="mt-2 text-sm text-slate-500">SAF 2026 관리자 현황을 한눈에 확인합니다.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="총 작가" value={stats.artists.total} href="/admin/artists" />
        <StatCard
          title="승인 대기"
          value={stats.artists.pending}
          subtitle={stats.artists.pending > 0 ? '확인 필요' : '없음'}
          href="/admin/users"
        />
        <StatCard title="총 작품" value={stats.artworks.total} href="/admin/artworks" />
        <StatCard title="숨김 처리" value={stats.artworks.hidden} />
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 mt-8">
        <RevenueCard
          title="총 매출"
          value={stats.revenue.totalRevenue}
          subtitle={`판매 완료: ${stats.revenue.soldCount}개`}
        />
        <RevenueCard
          title="재고 가치"
          value={stats.revenue.inventoryValue}
          subtitle="판매 중 작품의 총 가격"
        />
        <RevenueCard
          title="평균 판매가"
          value={stats.revenue.averagePrice}
          subtitle="판매 완료 작품 기준"
        />
      </div>

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
