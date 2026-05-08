import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * Commerce Funnel 패널 — Phase B.
 *
 * 단계: 작품 페이지뷰 → 체크아웃 진입 → 주문 생성 → 결제 완료
 * 각 단계 drop-off로 매출 누수 지점 식별.
 *
 * 데이터: page_views(artworks/, checkout/ path 매칭) + orders 테이블 join.
 */
interface Props {
  data: AnalyticsData['commerce'];
}

export default async function CommercePanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();
  const krwFormatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  });

  const { summary } = data;
  const viewToCheckout =
    summary.artworkViews > 0
      ? Math.round((summary.checkoutViews / summary.artworkViews) * 1000) / 10
      : 0;
  const checkoutToPaid =
    summary.checkoutViews > 0
      ? Math.round((summary.ordersPaid / summary.checkoutViews) * 1000) / 10
      : 0;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('commerceTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('commerceDescription')}</p>
      </div>

      {/* Funnel summary — 5 stage stat cards */}
      <AdminCard className="p-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <FunnelStat
            label={t('funnelArtworkViews')}
            value={numberFormatter.format(summary.artworkViews)}
            sub={`${numberFormatter.format(summary.uniqueArtworkVisitors)} ${t('visitors').toLowerCase()}`}
          />
          <FunnelStat
            label={t('funnelCheckoutViews')}
            value={numberFormatter.format(summary.checkoutViews)}
            sub={
              summary.artworkViews > 0 ? `${viewToCheckout}% ${t('viewToCheckoutRate')}` : undefined
            }
          />
          <FunnelStat
            label={t('funnelOrdersCreated')}
            value={numberFormatter.format(summary.ordersCreated)}
          />
          <FunnelStat
            label={t('funnelOrdersPaid')}
            value={numberFormatter.format(summary.ordersPaid)}
            sub={
              summary.checkoutViews > 0
                ? `${checkoutToPaid}% ${t('checkoutToPaidRate')}`
                : undefined
            }
            highlight
          />
          <FunnelStat
            label={t('funnelRevenue')}
            value={krwFormatter.format(summary.totalRevenue)}
            highlight
          />
        </div>
      </AdminCard>

      {/* 일별 매출 추이 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('revenueTrendTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('revenueTrendDesc')}</p>
        </AdminCardHeader>
        {data.revenueDailyTrend.length === 0 ? (
          <AdminEmptyState title={t('noRevenueData')} description={t('noRevenueDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">Date</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('paidColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('revenueColumn')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.revenueDailyTrend.map((row) => (
                  <tr key={row.date} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 font-mono text-xs text-gray-700">{row.date}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.ordersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {krwFormatter.format(row.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {/* 작품별 funnel TOP 20 */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('topArtworkFunnelTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('topArtworkFunnelDesc')}</p>
        </AdminCardHeader>
        {data.topArtworkFunnel.length === 0 ? (
          <AdminEmptyState title={t('noFunnelData')} description={t('noFunnelDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">{t('artworkColumn')}</th>
                  <th className="px-6 py-3 font-medium text-gray-500">{t('artistColumn')}</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('viewsColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('checkoutColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('paidColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('revenueColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('checkoutToPaidRate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.topArtworkFunnel.map((row) => (
                  <tr key={row.artworkId} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 max-w-[280px]">
                      <a
                        href={`/artworks/${row.artworkId}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:underline"
                      >
                        <div className="font-medium text-gray-900 line-clamp-2">
                          {row.artworkTitle || (
                            <span className="font-mono text-xs text-gray-500">{row.artworkId}</span>
                          )}
                        </div>
                        {row.artworkTitle && (
                          <div className="font-mono text-[10px] text-gray-400 mt-0.5 truncate">
                            {row.artworkId}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="px-6 py-3 text-gray-700">{row.artist || '—'}</td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.views)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.checkoutViews)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.ordersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {row.revenue > 0 ? krwFormatter.format(row.revenue) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {row.checkoutViews > 0 ? (
                        <span
                          className={
                            row.checkoutToPaidRate >= 50
                              ? 'text-success-a11y font-medium'
                              : row.checkoutToPaidRate < 10
                                ? 'text-danger-a11y'
                                : 'text-gray-700'
                          }
                        >
                          {row.checkoutToPaidRate}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </section>
  );
}

function FunnelStat({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl font-bold tracking-tight ${highlight ? 'text-success-a11y' : 'text-gray-900'}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-gray-500">{sub}</p>}
    </div>
  );
}
