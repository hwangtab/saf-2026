import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getTranslations } from 'next-intl/server';

/**
 * 작가별·매거진별 매출 기여도 패널 — Phase C.
 *
 * - artistDashboard: 작가별 페이지뷰·결제·매출. 매출 큰 순.
 * - storyAttributedRevenue: 매거진별 last-touch attribution.
 *
 * Attribution 한계: orders.device_id 컬럼 부재로 명시적 사용자 매칭 불가. 매거진에서
 * 클릭된 artwork의 paid 매출을 그 매거진에 기여로 인정 (double-counting 가능).
 * 정확한 attribution은 orders 테이블에 device_id 컬럼 추가 + 시간 기반 매칭 필요.
 */
interface Props {
  data: AnalyticsData['attribution'];
}

export default async function AttributionPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const numberFormatter = new Intl.NumberFormat();
  const krwFormatter = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  });

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('attributionTitle')}</h2>
        <p className="mt-1 text-sm text-gray-500">{t('attributionDescription')}</p>
      </div>

      {/* 작가별 commerce dashboard */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('artistDashboardTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('artistDashboardDesc')}</p>
        </AdminCardHeader>
        {data.artistDashboard.length === 0 ? (
          <AdminEmptyState title={t('noArtistData')} description={t('noArtistDataDesc')} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">{t('artistColumnLong')}</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('artworkCountColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('viewsColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('visitors')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('paidColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('revenueColumn')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('viewToPaidRate')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.artistDashboard.map((row) => (
                  <tr key={row.artistId} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 font-medium text-gray-900 max-w-[200px] truncate">
                      {row.artistName}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-500">
                      {numberFormatter.format(row.artworkCount)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.totalViews)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                      {numberFormatter.format(row.uniqueVisitors)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.ordersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {row.totalRevenue > 0 ? krwFormatter.format(row.totalRevenue) : '—'}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums">
                      {row.totalViews > 0 ? (
                        <span
                          className={
                            row.viewToPaidRate >= 1
                              ? 'text-success-a11y font-medium'
                              : row.viewToPaidRate === 0 && row.totalViews >= 50
                                ? 'text-danger-a11y'
                                : 'text-gray-700'
                          }
                        >
                          {row.viewToPaidRate}%
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

      {/* 매거진별 매출 attribution */}
      <AdminCard className="flex flex-col">
        <AdminCardHeader className="rounded-t-2xl">
          <h3 className="text-base font-semibold text-gray-900">{t('storyAttributionTitle')}</h3>
          <p className="mt-1 text-xs text-gray-500">{t('storyAttributionDesc')}</p>
        </AdminCardHeader>
        {data.storyAttributedRevenue.length === 0 ? (
          <AdminEmptyState
            title={t('noAttributionData')}
            description={t('noAttributionDataDesc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-3 font-medium text-gray-500">{t('storyTitleColumn')}</th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('totalClicks')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('uniqueClickers')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('attributedOrders')}
                  </th>
                  <th className="px-6 py-3 text-right font-medium text-gray-500">
                    {t('attributedRevenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.storyAttributedRevenue.map((row) => (
                  <tr key={row.storySlug} className="transition-colors hover:bg-gray-50">
                    <td className="px-6 py-3 max-w-[400px]">
                      <a
                        href={`/stories/${row.storySlug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block hover:underline"
                      >
                        <div className="font-medium text-gray-900 line-clamp-2">
                          {row.storyTitle ?? row.storySlug}
                        </div>
                        {row.storyTitle && (
                          <div className="text-xs text-gray-500 mt-0.5 truncate">
                            {row.storySlug}
                          </div>
                        )}
                      </a>
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.totalClicks)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-700">
                      {numberFormatter.format(row.uniqueClickers)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums text-gray-900">
                      {numberFormatter.format(row.attributedOrdersPaid)}
                    </td>
                    <td className="px-6 py-3 text-right tabular-nums font-medium text-gray-900">
                      {row.attributedRevenue > 0 ? krwFormatter.format(row.attributedRevenue) : '—'}
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
