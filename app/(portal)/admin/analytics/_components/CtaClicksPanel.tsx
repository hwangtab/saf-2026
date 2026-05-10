import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * CTA Clicks 패널 — donate / share 외부 conversion 측정.
 *
 * 기존 5개 대섹션이 다루지 않던 사각지대:
 * - donate_click: 외부 도메인 이탈이라 page_view·referrer로 안 잡힘
 * - share_click: 사이트 viral 확산 측정 (어떤 콘텐츠가 공유되는가)
 *
 * 데이터 source: page_views.event_name='donate_click' / 'share_click' (자체 적재).
 */

interface Props {
  data: AnalyticsData['ctaClicks'];
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${highlight ? 'text-success-a11y' : 'text-gray-900'}`}
      >
        {value}
      </p>
    </div>
  );
}

export default async function CtaClicksPanel({ data }: Props) {
  const t = await getTranslations('admin.analytics');
  const locale = await getLocale();
  const intlLocale = locale === 'en' ? 'en-US' : 'ko-KR';
  const numberFormatter = new Intl.NumberFormat(intlLocale);
  const dateFormatter = new Intl.DateTimeFormat(intlLocale, {
    month: '2-digit',
    day: '2-digit',
  });

  const hasDonate = data.donate.totalClicks > 0;
  const hasShare = data.share.totalClicks > 0;

  return (
    <section className="space-y-8">
      {/* ========================== Donate ========================== */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('ctaDonateTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('ctaDonateDesc')}</p>
        </div>

        {!hasDonate ? (
          <AdminCard className="flex flex-col">
            <AdminEmptyState title={t('ctaDonateNoData')} description={t('ctaDonateNoDataDesc')} />
          </AdminCard>
        ) : (
          <>
            {/* 4-stat 요약 */}
            <AdminCard className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label={t('ctaTotalClicks')}
                  value={numberFormatter.format(data.donate.totalClicks)}
                  highlight
                />
                <Stat
                  label={t('ctaUniqueClickers')}
                  value={numberFormatter.format(data.donate.uniqueClickers)}
                />
                <Stat
                  label={t('ctaDonateTarget')}
                  value={numberFormatter.format(data.donate.donateTargetClicks)}
                />
                <Stat
                  label={t('ctaJoinMemberTarget')}
                  value={numberFormatter.format(data.donate.joinMemberTargetClicks)}
                />
              </div>
            </AdminCard>

            {/* Position × Target 분포 */}
            {data.donate.positionDistribution.length > 0 && (
              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">{t('ctaPositionTitle')}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t('ctaPositionDesc')}</p>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('ctaPositionColumn')}</th>
                        <th className="px-4 py-2 text-left">{t('ctaTargetColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.donate.positionDistribution.map((row) => (
                        <tr key={`${row.position}-${row.target}`}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.position}
                          </td>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.target}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                            {numberFormatter.format(row.clicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.uniqueClickers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            )}

            {/* 일자별 추이 */}
            {data.donate.daily.length > 0 && (
              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">{t('ctaDailyTitle')}</h3>
                  <p className="mt-1 text-xs text-gray-500">{t('ctaDailyDesc')}</p>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('gscDateColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {[...data.donate.daily].reverse().map((row) => (
                        <tr key={row.date}>
                          <td className="px-4 py-2 tabular-nums text-gray-700">
                            {dateFormatter.format(new Date(row.date))}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-900">
                            {numberFormatter.format(row.clicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.uniqueClickers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            )}
          </>
        )}
      </div>

      {/* ========================== Share ========================== */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('ctaShareTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('ctaShareDesc')}</p>
        </div>

        {!hasShare ? (
          <AdminCard className="flex flex-col">
            <AdminEmptyState title={t('ctaShareNoData')} description={t('ctaDonateNoDataDesc')} />
          </AdminCard>
        ) : (
          <>
            {/* 2-stat 요약 + 채널 분포 */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <AdminCard className="p-6">
                <div className="grid grid-cols-2 gap-4">
                  <Stat
                    label={t('ctaTotalClicks')}
                    value={numberFormatter.format(data.share.totalClicks)}
                    highlight
                  />
                  <Stat
                    label={t('ctaUniqueClickers')}
                    value={numberFormatter.format(data.share.uniqueClickers)}
                  />
                </div>
              </AdminCard>

              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('ctaShareChannelTitle')}
                  </h3>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('ctaShareChannelColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.share.channelDistribution.map((row) => (
                        <tr key={row.channel}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.channel}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                            {numberFormatter.format(row.clicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.uniqueClickers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            </div>

            {/* 가장 많이 공유된 페이지 */}
            {data.share.topPages.length > 0 && (
              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('ctaShareTopPagesTitle')}
                  </h3>
                  <p className="mt-1 text-xs text-gray-500">{t('ctaShareTopPagesDesc')}</p>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('wvPagePathColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.share.topPages.map((row) => (
                        <tr key={row.pagePath}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.pagePath}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                            {numberFormatter.format(row.clicks)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.uniqueClickers)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </AdminCard>
            )}
          </>
        )}
      </div>
    </section>
  );
}
