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
import { getTranslations, getLocale } from 'next-intl/server';

function StatCard({
  title,
  valueText,
  subtitle,
  href,
  helpContent,
}: {
  title: string;
  valueText: string;
  subtitle?: string;
  href?: string;
  helpContent?: string;
}) {
  const content = (
    <AdminCard className="flex h-full flex-col justify-between p-6 transition-[transform,box-shadow] duration-200">
      <div>
        <div className="flex items-center gap-1">
          <p className="text-sm font-medium text-slate-500">{title}</p>
          {helpContent && <AdminHelp>{helpContent}</AdminHelp>}
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

function formatDate(dateString: string | null | undefined, locale: string) {
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
  const locale = await getLocale();
  const t = await getTranslations('admin.dashboard');
  const numberFormatter = new Intl.NumberFormat(locale === 'en' ? 'en-US' : 'ko-KR');

  let stats;
  try {
    stats = await getDashboardOverviewStats();
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    return (
      <div className="p-8">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <h2 className="text-lg font-semibold text-red-800">{t('loadErrorTitle')}</h2>
          <p className="mt-2 text-sm text-red-600">{t('loadErrorMessage')}</p>
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
            {t('title')}
            <AdminHelp>{t('titleHelp')}</AdminHelp>
          </AdminPageTitle>
          <AdminPageDescription>{t('description')}</AdminPageDescription>
        </AdminPageHeader>
        <Link
          href="/admin/revenue"
          className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
        >
          {t('revenueButton')}
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title={t('artistsTotal')}
          valueText={numberFormatter.format(stats.artists.totalRegistered)}
          subtitle={`${t('artistsUnlinked')}: ${stats.artists.unlinkedAccounts}`}
          href="/admin/artists"
        />
        <StatCard
          title={t('linkedArtistAccounts')}
          valueText={numberFormatter.format(stats.artists.linkedAccounts)}
          subtitle={`${t('linkedRate')}: ${linkedRate}%`}
          href="/admin/users"
          helpContent={t('linkedHelp')}
        />
        <StatCard
          title={t('artistsPending')}
          valueText={numberFormatter.format(stats.artists.pendingApplications)}
          subtitle={stats.artists.pendingApplications > 0 ? t('needsCheck') : t('noPending')}
          href="/admin/users?status=pending"
        />
        <StatCard
          title={t('artworksTotal')}
          valueText={numberFormatter.format(stats.artworks.total)}
          subtitle={`${t('soldCount')}: ${numberFormatter.format(stats.artworks.sold)}`}
          href="/admin/artworks"
        />
        <StatCard
          title={t('soldArtworks')}
          valueText={numberFormatter.format(stats.artworks.sold)}
          subtitle={`${t('soldRate')}: ${soldRate}%`}
          href="/admin/artworks?status=sold"
        />
        <StatCard
          title={t('hiddenArtworks')}
          valueText={numberFormatter.format(stats.artworks.hidden)}
          subtitle={`${t('hiddenRate')}: ${hiddenRate}%`}
          href="/admin/artworks?visibility=hidden"
          helpContent={t('hiddenHelp')}
        />
        <StatCard
          title={t('pendingOrders')}
          valueText={numberFormatter.format(stats.pendingOrderCount)}
          subtitle={stats.pendingOrderCount > 0 ? t('needsCheck') : t('noPending')}
          href="/admin/orders?status=pending_payment"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueCard
          title={`${stats.revenue.currentMonthLabel} ${t('monthlyRevenue')}`}
          value={stats.revenue.currentMonthRevenue}
          subtitle={`${t('soldCount')}: ${numberFormatter.format(stats.revenue.currentMonthSoldCount)}`}
        />
        <AdminCard className="flex flex-col justify-between p-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{t('analyticsPanelTitle')}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {t('analyticsPanelDescription')}
            </p>
          </div>
          <div className="mt-6">
            <Link
              href="/admin/revenue"
              className="inline-flex items-center justify-center rounded-lg border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              {t('analyticsPanelButton')}
            </Link>
          </div>
        </AdminCard>
      </div>

      {/* 사이트 현황 */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.siteAnalytics ? (
          <>
            <AdminCard className="flex h-full flex-col justify-between bg-emerald-50/50 p-6 transition-[transform,box-shadow] duration-200">
              <div>
                <p className="text-sm font-medium text-emerald-700">{t('realtimeVisitors')}</p>
                <p className="mt-2 text-3xl font-bold tracking-tight text-emerald-900">
                  {numberFormatter.format(stats.siteAnalytics.realtimeVisitors)}
                </p>
              </div>
              <p className="mt-2 text-sm text-emerald-600">{t('recentFiveMin')}</p>
            </AdminCard>
            <StatCard
              title={t('pageViews30d')}
              valueText={numberFormatter.format(stats.siteAnalytics.totalPageViews)}
              href="/admin/analytics"
            />
            <StatCard
              title={t('uniqueVisitors30d')}
              valueText={numberFormatter.format(stats.siteAnalytics.uniqueVisitors)}
              href="/admin/analytics"
            />
          </>
        ) : (
          <>
            <AdminCard className="flex h-full items-center justify-center p-6 sm:col-span-2 lg:col-span-3">
              <p className="text-sm text-slate-400">{t('siteAnalyticsUnavailable')}</p>
            </AdminCard>
          </>
        )}
        {stats.feedback ? (
          <StatCard
            title={t('openFeedback')}
            valueText={numberFormatter.format(stats.feedback.openCount)}
            subtitle={stats.feedback.openCount > 0 ? t('needsCheck') : t('processedDone')}
            href="/admin/feedback"
          />
        ) : (
          <AdminCard className="flex h-full items-center justify-center p-6">
            <p className="text-sm text-slate-400">{t('noFeedbackData')}</p>
          </AdminCard>
        )}
      </div>

      {/* 인기 페이지 + 최근 피드백 */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{t('topPagesTitle')}</h2>
            <Link
              href="/admin/analytics"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {!stats.siteAnalytics || stats.siteAnalytics.topPages.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{t('noPageData')}</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.siteAnalytics.topPages.map((page, i) => {
                  let displayPath: string;
                  try {
                    displayPath = decodeURIComponent(page.path);
                  } catch (error) {
                    console.error('[admin-dashboard] Top page path decoding failed:', error);
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
            <h2 className="text-base font-semibold text-slate-900">{t('recentFeedbackTitle')}</h2>
            <Link
              href="/admin/feedback"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {!stats.feedback || stats.feedback.recentItems.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{t('noOpenFeedback')}</div>
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
                            ? t('feedbackCategoryBug')
                            : item.category === 'improvement'
                              ? t('feedbackCategoryImprovement')
                              : item.category === 'question'
                                ? t('feedbackCategoryQuestion')
                                : t('feedbackCategoryOther')}
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

      {/* 최근 주문 */}
      <section>
        <AdminCard className="flex flex-col">
          <AdminCardHeader className="rounded-t-2xl">
            <h2 className="text-base font-semibold text-slate-900">{t('recentOrdersTitle')}</h2>
            <Link
              href="/admin/orders"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentOrders.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{t('noRecentOrders')}</div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recentOrders.map((order) => {
                  const statusKey = `orderStatus${order.status
                    .split('_')
                    .map((s: string) => s.charAt(0).toUpperCase() + s.slice(1))
                    .join('')}` as Parameters<typeof t>[0];
                  const isPending =
                    order.status === 'pending_payment' || order.status === 'awaiting_deposit';
                  return (
                    <li key={order.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/admin/orders/${order.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-indigo-600 hover:underline truncate"
                            >
                              {order.artwork_title || order.order_no}
                              {order.artist_name && (
                                <span className="font-normal text-gray-400">
                                  {' '}
                                  · {order.artist_name}
                                </span>
                              )}
                            </Link>
                            <span
                              className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${
                                isPending
                                  ? 'bg-amber-100 text-amber-700'
                                  : ['paid', 'preparing', 'shipped', 'delivered'].includes(
                                        order.status
                                      )
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : order.status === 'completed'
                                      ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {t(statusKey)}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {order.buyer_name || '—'} · ₩
                            {numberFormatter.format(order.total_amount)}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded-full">
                          {formatDate(order.created_at, locale)}
                        </span>
                      </div>
                    </li>
                  );
                })}
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
              {t('recentApplicationsTitle')}
            </h2>
            <Link
              href="/admin/users?status=pending"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('viewAll')}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentApplications.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">
                {t('noPendingApplications')}
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
            <h2 className="text-base font-semibold text-slate-900">{t('recentArtworksTitle')}</h2>
            <Link
              href="/admin/artworks?sort=recent"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:underline"
            >
              {t('viewRecent')}
            </Link>
          </AdminCardHeader>
          <div className="p-0">
            {stats.recentArtworks.length === 0 ? (
              <div className="p-8 text-center text-sm text-gray-500">{t('noArtworks')}</div>
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
