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
    <div className="bg-white shadow-sm rounded-lg p-6">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
      {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block hover:ring-2 hover:ring-indigo-500 hover:ring-offset-2 rounded-lg transition-shadow"
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">대시보드</h1>
        <p className="text-sm text-gray-500 mt-2">SAF 2026 관리자 현황을 한눈에 확인합니다.</p>
      </div>

      {/* 작가 현황 */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">작가 현황</h2>
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
      </div>

      {/* 작품 현황 */}
      <div>
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
          <div className="mt-4 bg-white shadow-sm rounded-lg p-6">
            <p className="text-sm font-medium text-gray-500 mb-3">판매 현황 비율</p>
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
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-green-500 rounded-full" />
                판매 중
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-yellow-500 rounded-full" />
                예약됨
              </span>
              <span className="flex items-center gap-1">
                <span className="w-3 h-3 bg-blue-500 rounded-full" />
                판매 완료
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 최근 활동 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* 최근 가입 신청 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 가입 신청</h2>
            <Link href="/admin/users" className="text-sm text-indigo-600 hover:underline">
              전체 보기
            </Link>
          </div>
          {stats.recentApplications.length === 0 ? (
            <p className="text-sm text-gray-500">대기 중인 신청이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.recentApplications.map((app) => (
                <li key={app.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{app.name}</p>
                      <p className="text-xs text-gray-500">{app.email}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(app.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 최근 등록된 작품 */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">최근 등록된 작품</h2>
            <Link href="/admin/artworks" className="text-sm text-indigo-600 hover:underline">
              전체 보기
            </Link>
          </div>
          {stats.recentArtworks.length === 0 ? (
            <p className="text-sm text-gray-500">등록된 작품이 없습니다.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.recentArtworks.map((artwork) => (
                <li key={artwork.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link
                        href={`/admin/artworks/${artwork.id}`}
                        className="text-sm font-medium text-gray-900 hover:text-indigo-600"
                      >
                        {artwork.title}
                      </Link>
                      <p className="text-xs text-gray-500">{artwork.artist_name}</p>
                    </div>
                    <p className="text-xs text-gray-400">{formatDate(artwork.created_at)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
