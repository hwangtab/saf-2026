import { requireAdmin } from '@/lib/auth/guards';
import { getDashboardStats } from '@/app/actions/admin-dashboard';
import Link from 'next/link';

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
    <div className="bg-white shadow-sm rounded-lg p-6 border border-gray-200 h-full flex flex-col justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      </div>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 rounded-lg transition-all hover:shadow-md"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function formatDate(dateString: string) {
  const date = new Date(dateString);
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
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-2">SAF 2026 관리자 현황을 한눈에 확인합니다.</p>
      </div>

      {/* 작가 현황 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          작가 현황
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard title="전체 작가" value={stats.artists.total} href="/admin/artists" />
          <StatCard
            title="승인 대기"
            value={stats.artists.pending}
            subtitle={stats.artists.pending > 0 ? '확인 필요' : '없음'}
            href="/admin/users"
          />
          <StatCard title="정지된 계정" value={stats.artists.suspended} href="/admin/users" />
        </div>
      </section>

      {/* 작품 현황 */}
      <section>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">작품 현황</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          <StatCard title="전체 작품" value={stats.artworks.total} href="/admin/artworks" />
          <StatCard title="판매 중" value={stats.artworks.available} />
          <StatCard title="예약됨" value={stats.artworks.reserved} />
          <StatCard title="판매 완료" value={stats.artworks.sold} />
          <StatCard title="숨김 처리" value={stats.artworks.hidden} />
        </div>

        {/* 판매 현황 바 차트 */}
        {stats.artworks.total > 0 && (
          <div className="mt-4 bg-white shadow-sm rounded-lg p-6 border border-gray-200">
            <div className="flex justify-between items-end mb-3">
              <p className="text-sm font-medium text-gray-900">판매 현황 비율</p>
              <span className="text-xs text-gray-500">전체 {stats.artworks.total}점 중</span>
            </div>
            <div
              className="flex h-4 rounded-full overflow-hidden bg-gray-100"
              role="img"
              aria-label={`판매 현황: 판매 중 ${stats.artworks.available}점, 예약됨 ${stats.artworks.reserved}점, 판매 완료 ${stats.artworks.sold}점`}
            >
              <div
                className="bg-green-500"
                style={{
                  width: `${(stats.artworks.available / stats.artworks.total) * 100}%`,
                }}
                title={`판매 중: ${stats.artworks.available}점`}
              />
              <div
                className="bg-yellow-500"
                style={{
                  width: `${(stats.artworks.reserved / stats.artworks.total) * 100}%`,
                }}
                title={`예약됨: ${stats.artworks.reserved}점`}
              />
              <div
                className="bg-blue-500"
                style={{
                  width: `${(stats.artworks.sold / stats.artworks.total) * 100}%`,
                }}
                title={`판매 완료: ${stats.artworks.sold}점`}
              />
            </div>
            <div className="flex gap-6 mt-3 text-xs text-gray-600 justify-end">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
                판매 중 ({stats.artworks.available})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-yellow-500 rounded-full" />
                예약됨 ({stats.artworks.reserved})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                판매 완료 ({stats.artworks.sold})
              </span>
            </div>
          </div>
        )}
      </section>

      {/* 최근 활동 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 최근 가입 신청 */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-lg">
            <h2 className="text-base font-semibold text-gray-900">최근 가입 신청</h2>
            <Link
              href="/admin/users"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              전체 보기
            </Link>
          </div>
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
        </div>

        {/* 최근 등록된 작품 */}
        <div className="bg-white shadow-sm rounded-lg border border-gray-200 flex flex-col">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-lg">
            <h2 className="text-base font-semibold text-gray-900">최근 등록된 작품</h2>
            <Link
              href="/admin/artworks"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              전체 보기
            </Link>
          </div>
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
        </div>
      </section>
    </div>
  );
}
