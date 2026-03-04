import { getDashboardOverviewStats } from '@/app/actions/admin-dashboard-overview';
import Link from 'next/link';
import {
  AdminCard,
  AdminCardHeader,
  AdminPageDescription,
  AdminPageHeader,
  AdminPageTitle,
  AdminHelp,
} from '@/app/admin/_components/admin-ui';
import { RevenueCard } from '@/app/admin/_components/RevenueCard';

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

function StatCard({
  title,
  valueText,
  subtitle,
  href,
}: {
  title: string;
  valueText: string;
  subtitle?: string;
  href?: string;
}) {
  const content = (
    <AdminCard className="flex h-full flex-col justify-between p-6 transition-all duration-200">
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {title === '연결된 아티스트 계정' && (
            <AdminHelp>
              전체 작가 프로필 중 실제 사용자 계정과 연결된 수입니다. 연결된 작가만 작품을 직접
              관리할 수 있습니다.
            </AdminHelp>
          )}
          {title === '숨김 작품' && (
            <AdminHelp>
              현재 &apos;공개 안 함&apos;으로 설정되어 사용자 웹사이트에 노출되지 않는 작품의
              수입니다.
            </AdminHelp>
          )}
        </div>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{valueText}</p>
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

export default async function AdminDashboardPage() {
  let stats;
  try {
    stats = await getDashboardOverviewStats();
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800">대시보드 로딩 오류</h2>
          <p className="mt-2 text-sm text-red-600">
            데이터를 불러오는 중 문제가 발생했습니다. (Error:{' '}
            {error instanceof Error ? error.message : String(error)})
          </p>
          <pre className="mt-4 overflow-auto rounded bg-red-100 p-4 text-xs">
            {JSON.stringify(error, Object.getOwnPropertyNames(error), 2)}
          </pre>
        </div>
      </div>
    );
  }

  const linkedRate =
    stats.artists.totalRegistered > 0
      ? Math.round((stats.artists.linkedAccounts / stats.artists.totalRegistered) * 100)
      : 0;

  const hiddenRate =
    stats.artworks.total > 0 ? Math.round((stats.artworks.hidden / stats.artworks.total) * 100) : 0;
  const soldRate =
    stats.artworks.total > 0 ? Math.round((stats.artworks.sold / stats.artworks.total) * 100) : 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <AdminPageHeader>
          <AdminPageTitle>
            대시보드
            <AdminHelp>
              SAF 2026 운영 현황을 간략하게 요약합니다. 매출 상세 분석은 별도 매출 현황 페이지에서
              확인할 수 있습니다.
            </AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>
            관리자 운영 핵심 지표와 최근 활동만 빠르게 확인합니다.
          </AdminPageDescription>
        </AdminPageHeader>
        <Link
          href="/admin/revenue"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          매출 현황 보기
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="등록 작가(전체)"
          valueText={NUMBER_FORMATTER.format(stats.artists.totalRegistered)}
          subtitle={`계정 미연결: ${stats.artists.unlinkedAccounts}명`}
          href="/admin/artists"
        />
        <StatCard
          title="연결된 아티스트 계정"
          valueText={NUMBER_FORMATTER.format(stats.artists.linkedAccounts)}
          subtitle={`연결률: ${linkedRate}%`}
          href="/admin/users"
        />
        <StatCard
          title="아티스트 신청 대기"
          valueText={NUMBER_FORMATTER.format(stats.artists.pendingApplications)}
          subtitle={stats.artists.pendingApplications > 0 ? '확인 필요' : '대기 없음'}
          href="/admin/users?status=pending"
        />
        <StatCard
          title="등록 작품(전체)"
          valueText={NUMBER_FORMATTER.format(stats.artworks.total)}
          subtitle={`판매 완료: ${NUMBER_FORMATTER.format(stats.artworks.sold)}점`}
          href="/admin/artworks"
        />
        <StatCard
          title="판매 완료 작품"
          valueText={NUMBER_FORMATTER.format(stats.artworks.sold)}
          subtitle={`전체 작품 대비: ${soldRate}%`}
          href="/admin/artworks?status=sold"
        />
        <StatCard
          title="숨김 작품"
          valueText={NUMBER_FORMATTER.format(stats.artworks.hidden)}
          subtitle={`전체 작품 대비: ${hiddenRate}%`}
          href="/admin/artworks?visibility=hidden"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueCard
          title={`${stats.revenue.currentMonthLabel} 매출`}
          value={stats.revenue.currentMonthRevenue}
          subtitle={`판매 완료: ${NUMBER_FORMATTER.format(stats.revenue.currentMonthSoldCount)}점`}
        />
        <AdminCard className="flex flex-col justify-between p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">매출 분석 전용 화면</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              회계 기준 월별(1월~12월) 매출, 전월/전년 동월 비교, 작품/작가별 매출을 별도 페이지에서
              확인하세요.
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin/revenue"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              매출 현황 페이지로 이동
            </Link>
          </div>
        </AdminCard>
      </div>

      {/* 최근 활동 */}
      <section className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 최근 가입 신청 */}
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">최근 가입 신청</h2>
            <Link
              href="/admin/users?status=pending"
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
              href="/admin/artworks?sort=recent"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              최근 등록순으로 보기
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
