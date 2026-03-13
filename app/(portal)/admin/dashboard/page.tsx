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
import { getServerLocale } from '@/lib/server-locale';

type LocaleCode = 'ko' | 'en';

const DASHBOARD_COPY: Record<
  LocaleCode,
  {
    loadErrorTitle: string;
    loadErrorMessage: string;
    title: string;
    titleHelp: string;
    description: string;
    revenueButton: string;
    artistsTotal: string;
    artistsUnlinked: string;
    linkedArtistAccounts: string;
    linkedHelp: string;
    linkedRate: string;
    artistsPending: string;
    needsCheck: string;
    noPending: string;
    artworksTotal: string;
    soldCount: string;
    soldArtworks: string;
    soldRate: string;
    hiddenArtworks: string;
    hiddenHelp: string;
    hiddenRate: string;
    monthlyRevenue: string;
    analyticsPanelTitle: string;
    analyticsPanelDescription: string;
    analyticsPanelButton: string;
    realtimeVisitors: string;
    recentFiveMin: string;
    pageViews30d: string;
    uniqueVisitors30d: string;
    siteAnalyticsUnavailable: string;
    openFeedback: string;
    processedDone: string;
    noFeedbackData: string;
    topPagesTitle: string;
    viewAll: string;
    noPageData: string;
    recentFeedbackTitle: string;
    noOpenFeedback: string;
    feedbackCategory: Record<'bug' | 'improvement' | 'question' | 'other', string>;
    recentApplicationsTitle: string;
    noPendingApplications: string;
    recentArtworksTitle: string;
    viewRecent: string;
    noArtworks: string;
  }
> = {
  ko: {
    loadErrorTitle: '대시보드 로딩 오류',
    loadErrorMessage: '데이터를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.',
    title: '대시보드',
    titleHelp:
      'SAF 2026 운영 현황을 간략하게 요약합니다. 매출 상세 분석은 별도 매출 현황 페이지에서 확인할 수 있습니다.',
    description: '관리자 운영 핵심 지표와 최근 활동만 빠르게 확인합니다.',
    revenueButton: '매출 현황 보기',
    artistsTotal: '등록 작가(전체)',
    artistsUnlinked: '계정 미연결',
    linkedArtistAccounts: '연결된 아티스트 계정',
    linkedHelp:
      '전체 작가 프로필 중 실제 사용자 계정과 연결된 수입니다. 연결된 작가만 작품을 직접 관리할 수 있습니다.',
    linkedRate: '연결률',
    artistsPending: '아티스트 신청 대기',
    needsCheck: '확인 필요',
    noPending: '대기 없음',
    artworksTotal: '등록 작품(전체)',
    soldCount: '판매 완료',
    soldArtworks: '판매 완료 작품',
    soldRate: '전체 작품 대비',
    hiddenArtworks: '숨김 작품',
    hiddenHelp: "현재 '공개 안 함'으로 설정되어 사용자 웹사이트에 노출되지 않는 작품의 수입니다.",
    hiddenRate: '전체 작품 대비',
    monthlyRevenue: '매출',
    analyticsPanelTitle: '매출 분석 전용 화면',
    analyticsPanelDescription:
      '회계 기준 월별(1월~12월) 매출, 전월/전년 동월 비교, 작품/작가별 매출을 별도 페이지에서 확인하세요.',
    analyticsPanelButton: '매출 현황 페이지로 이동',
    realtimeVisitors: '실시간 방문자',
    recentFiveMin: '최근 5분',
    pageViews30d: '30일 페이지뷰',
    uniqueVisitors30d: '30일 순방문자',
    siteAnalyticsUnavailable: '사이트 분석 데이터를 불러올 수 없습니다',
    openFeedback: '미해결 피드백',
    processedDone: '처리 완료',
    noFeedbackData: '피드백 데이터 없음',
    topPagesTitle: '인기 페이지 Top 5',
    viewAll: '전체 보기',
    noPageData: '페이지 데이터가 없습니다.',
    recentFeedbackTitle: '최근 피드백',
    noOpenFeedback: '미해결 피드백이 없습니다.',
    feedbackCategory: { bug: '버그', improvement: '개선', question: '질문', other: '기타' },
    recentApplicationsTitle: '최근 가입 신청',
    noPendingApplications: '대기 중인 신청이 없습니다.',
    recentArtworksTitle: '최근 등록된 작품',
    viewRecent: '최근 등록순으로 보기',
    noArtworks: '등록된 작품이 없습니다.',
  },
  en: {
    loadErrorTitle: 'Dashboard Load Error',
    loadErrorMessage: 'Failed to load data. Please try again shortly.',
    title: 'Dashboard',
    titleHelp:
      'This is a quick snapshot of SAF 2026 operations. For detailed revenue analytics, use the revenue page.',
    description: 'Quickly review key admin metrics and recent activity.',
    revenueButton: 'View Revenue',
    artistsTotal: 'Registered Artists (Total)',
    artistsUnlinked: 'Unlinked accounts',
    linkedArtistAccounts: 'Linked Artist Accounts',
    linkedHelp:
      'Number of artist profiles connected to real user accounts. Only linked artists can manage artworks directly.',
    linkedRate: 'Link rate',
    artistsPending: 'Pending Artist Applications',
    needsCheck: 'Needs review',
    noPending: 'No pending items',
    artworksTotal: 'Registered Artworks (Total)',
    soldCount: 'Sold',
    soldArtworks: 'Sold Artworks',
    soldRate: 'Share of total artworks',
    hiddenArtworks: 'Hidden Artworks',
    hiddenHelp: 'Number of artworks currently set to hidden and not visible on the public website.',
    hiddenRate: 'Share of total artworks',
    monthlyRevenue: 'Revenue',
    analyticsPanelTitle: 'Dedicated Revenue Analytics',
    analyticsPanelDescription:
      'Review monthly accounting revenue, month-over-month/year-over-year comparisons, and artist/artwork breakdowns on a dedicated page.',
    analyticsPanelButton: 'Go to Revenue Analytics',
    realtimeVisitors: 'Realtime Visitors',
    recentFiveMin: 'Last 5 minutes',
    pageViews30d: '30-Day Page Views',
    uniqueVisitors30d: '30-Day Unique Visitors',
    siteAnalyticsUnavailable: 'Unable to load site analytics data',
    openFeedback: 'Open Feedback',
    processedDone: 'All resolved',
    noFeedbackData: 'No feedback data',
    topPagesTitle: 'Top 5 Pages',
    viewAll: 'View all',
    noPageData: 'No page data available.',
    recentFeedbackTitle: 'Recent Feedback',
    noOpenFeedback: 'No open feedback.',
    feedbackCategory: {
      bug: 'Bug',
      improvement: 'Improvement',
      question: 'Question',
      other: 'Other',
    },
    recentApplicationsTitle: 'Recent Sign-up Applications',
    noPendingApplications: 'No pending applications.',
    recentArtworksTitle: 'Recently Registered Artworks',
    viewRecent: 'Sort by newest',
    noArtworks: 'No artworks registered.',
  },
};

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
          {(title === '연결된 아티스트 계정' || title === 'Linked Artist Accounts') && (
            <AdminHelp>
              전체 작가 프로필 중 실제 사용자 계정과 연결된 수입니다. 연결된 작가만 작품을 직접
              관리할 수 있습니다.
            </AdminHelp>
          )}
          {(title === '숨김 작품' || title === 'Hidden Artworks') && (
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

function formatDate(dateString: string | null | undefined, locale: LocaleCode) {
  if (!dateString) return '-';

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return '-';

  return date.toLocaleDateString(locale === 'en' ? 'en-US' : 'ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default async function AdminDashboardPage() {
  const locale = await getServerLocale();
  const copy = DASHBOARD_COPY[locale];
  const numberFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR');

  let stats;
  try {
    stats = await getDashboardOverviewStats();
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800">{copy.loadErrorTitle}</h2>
          <p className="mt-2 text-sm text-red-600">{copy.loadErrorMessage}</p>
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
            <AdminHelp>{copy.titleHelp}</AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>{copy.description}</AdminPageDescription>
        </AdminPageHeader>
        <Link
          href="/admin/revenue"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          {copy.revenueButton}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={copy.artistsTotal}
          valueText={numberFormatter.format(stats.artists.totalRegistered)}
          subtitle={`${copy.artistsUnlinked}: ${stats.artists.unlinkedAccounts}`}
          href="/admin/artists"
        />
        <StatCard
          title={copy.linkedArtistAccounts}
          valueText={numberFormatter.format(stats.artists.linkedAccounts)}
          subtitle={`${copy.linkedRate}: ${linkedRate}%`}
          href="/admin/users"
        />
        <StatCard
          title={copy.artistsPending}
          valueText={numberFormatter.format(stats.artists.pendingApplications)}
          subtitle={stats.artists.pendingApplications > 0 ? copy.needsCheck : copy.noPending}
          href="/admin/users?status=pending"
        />
        <StatCard
          title={copy.artworksTotal}
          valueText={numberFormatter.format(stats.artworks.total)}
          subtitle={`${copy.soldCount}: ${numberFormatter.format(stats.artworks.sold)}`}
          href="/admin/artworks"
        />
        <StatCard
          title={copy.soldArtworks}
          valueText={numberFormatter.format(stats.artworks.sold)}
          subtitle={`${copy.soldRate}: ${soldRate}%`}
          href="/admin/artworks?status=sold"
        />
        <StatCard
          title={copy.hiddenArtworks}
          valueText={numberFormatter.format(stats.artworks.hidden)}
          subtitle={`${copy.hiddenRate}: ${hiddenRate}%`}
          href="/admin/artworks?visibility=hidden"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueCard
          title={`${stats.revenue.currentMonthLabel} ${copy.monthlyRevenue}`}
          value={stats.revenue.currentMonthRevenue}
          subtitle={`${copy.soldCount}: ${numberFormatter.format(stats.revenue.currentMonthSoldCount)}`}
        />
        <AdminCard className="flex flex-col justify-between p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{copy.analyticsPanelTitle}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {copy.analyticsPanelDescription}
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin/revenue"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {copy.analyticsPanelButton}
            </Link>
          </div>
        </AdminCard>
      </div>

      {/* 사이트 현황 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.siteAnalytics ? (
          <>
            <AdminCard className="flex h-full flex-col justify-between bg-emerald-50/50 p-6 transition-all duration-200">
              <div>
                <p className="text-sm font-medium text-emerald-700">{copy.realtimeVisitors}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-900">
                  {numberFormatter.format(stats.siteAnalytics.realtimeVisitors)}
                </p>
              </div>
              <p className="mt-2 text-sm text-emerald-600">{copy.recentFiveMin}</p>
            </AdminCard>
            <StatCard
              title={copy.pageViews30d}
              valueText={numberFormatter.format(stats.siteAnalytics.totalPageViews)}
              href="/admin/analytics"
            />
            <StatCard
              title={copy.uniqueVisitors30d}
              valueText={numberFormatter.format(stats.siteAnalytics.uniqueVisitors)}
              href="/admin/analytics"
            />
          </>
        ) : (
          <>
            <AdminCard className="flex h-full items-center justify-center p-6 sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-slate-400">{copy.siteAnalyticsUnavailable}</p>
            </AdminCard>
          </>
        )}
        {stats.feedback ? (
          <StatCard
            title={copy.openFeedback}
            valueText={numberFormatter.format(stats.feedback.openCount)}
            subtitle={stats.feedback.openCount > 0 ? copy.needsCheck : copy.processedDone}
            href="/admin/feedback"
          />
        ) : (
          <AdminCard className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-slate-400">{copy.noFeedbackData}</p>
          </AdminCard>
        )}
      </div>

      {/* 인기 페이지 + 최근 피드백 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{copy.topPagesTitle}</h2>
            <Link
              href="/admin/analytics"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {copy.viewAll}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {!stats.siteAnalytics || stats.siteAnalytics.topPages.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{copy.noPageData}</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.siteAnalytics.topPages.map((page, i) => {
                  let displayPath: string;
                  try {
                    displayPath = decodeURIComponent(page.path);
                  } catch {
                    displayPath = page.path;
                  }
                  return (
                    <li key={page.path} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-500">
                          {i + 1}
                        </span>
                        <a
                          href={page.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="truncate text-sm text-gray-900 hover:text-indigo-600 hover:underline"
                        >
                          {displayPath}
                        </a>
                      </div>
                      <span className="ml-3 shrink-0 text-sm font-medium text-slate-500">
                        {numberFormatter.format(page.views)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </AdminCard>

        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{copy.recentFeedbackTitle}</h2>
            <Link
              href="/admin/feedback"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {copy.viewAll}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {!stats.feedback || stats.feedback.recentItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{copy.noOpenFeedback}</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.feedback.recentItems.map((item) => (
                  <li key={item.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                            item.category === 'bug'
                              ? 'bg-red-100 text-red-700'
                              : item.category === 'improvement'
                                ? 'bg-blue-100 text-blue-700'
                                : item.category === 'question'
                                  ? 'bg-amber-100 text-amber-700'
                                  : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {item.category === 'bug'
                            ? copy.feedbackCategory.bug
                            : item.category === 'improvement'
                              ? copy.feedbackCategory.improvement
                              : item.category === 'question'
                                ? copy.feedbackCategory.question
                                : copy.feedbackCategory.other}
                        </span>
                        <span className="truncate text-sm font-medium text-gray-900">
                          {item.title}
                        </span>
                      </div>
                      <span className="ml-3 shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                        {formatDate(item.created_at, locale)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </AdminCard>
      </section>

      {/* 최근 가입/작품 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">
              {copy.recentApplicationsTitle}
            </h2>
            <Link
              href="/admin/users?status=pending"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {copy.viewAll}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentApplications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {copy.noPendingApplications}
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
                        {formatDate(app.created_at, locale)}
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
            <h2 className="text-base font-semibold text-slate-900">{copy.recentArtworksTitle}</h2>
            <Link
              href="/admin/artworks?sort=recent"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {copy.viewRecent}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentArtworks.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{copy.noArtworks}</div>
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
                        {formatDate(artwork.created_at, locale)}
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
