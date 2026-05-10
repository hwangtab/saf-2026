import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';
import { getLocale, getTranslations } from 'next-intl/server';

/**
 * CTA Clicks 패널 — 조합원 가입 / share 외부 conversion 측정.
 *
 * 기존 5개 대섹션이 다루지 않던 사각지대:
 * - member_join_click: 외부 도메인(JOIN_MEMBER 폼) 이탈이라 page_view·referrer로 안 잡힘.
 *   후원함(socialfunch)은 종료된 캠페인이라 측정 대상 아님 — 단일 conversion target.
 * - share_click: 사이트 viral 확산 측정 (어떤 콘텐츠가 공유되는가)
 *
 * 데이터 source: page_views.event_name='member_join_click' / 'share_click' (자체 적재).
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

  const hasMemberJoin = data.memberJoin.totalClicks > 0;
  const hasShare = data.share.totalClicks > 0;
  const hasPurchase = data.purchase.totalClicks > 0;
  const hasLocaleSwitch = data.localeSwitch.totalSwitches > 0;

  return (
    <section className="space-y-8">
      {/* ========================== 조합원 가입 ========================== */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('ctaMemberJoinTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('ctaMemberJoinDesc')}</p>
        </div>

        {!hasMemberJoin ? (
          <AdminCard className="flex flex-col">
            <AdminEmptyState
              title={t('ctaMemberJoinNoData')}
              description={t('ctaMemberJoinNoDataDesc')}
            />
          </AdminCard>
        ) : (
          <>
            {/* 2-stat 요약 (단일 destination이라 target 분기 없음) */}
            <AdminCard className="p-6">
              <div className="grid grid-cols-2 gap-4">
                <Stat
                  label={t('ctaTotalClicks')}
                  value={numberFormatter.format(data.memberJoin.totalClicks)}
                  highlight
                />
                <Stat
                  label={t('ctaUniqueClickers')}
                  value={numberFormatter.format(data.memberJoin.uniqueClickers)}
                />
              </div>
            </AdminCard>

            {/* Position 분포 — 어드민 운영자가 어느 페이지·위치 CTA가 효과적인지 식별 */}
            {data.memberJoin.positionDistribution.length > 0 && (
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
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.memberJoin.positionDistribution.map((row) => (
                        <tr key={row.position}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.position}
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
            {data.memberJoin.daily.length > 0 && (
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
                      {[...data.memberJoin.daily].reverse().map((row) => (
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
            <AdminEmptyState title={t('ctaShareNoData')} description={t('ctaShareNoDataDesc')} />
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

      {/* ========================== 외부 구매 (Cafe24) ========================== */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('ctaPurchaseTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('ctaPurchaseDesc')}</p>
        </div>

        {!hasPurchase ? (
          <AdminCard className="flex flex-col">
            <AdminEmptyState
              title={t('ctaPurchaseNoData')}
              description={t('ctaPurchaseNoDataDesc')}
            />
          </AdminCard>
        ) : (
          <>
            <AdminCard className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <Stat
                  label={t('ctaTotalClicks')}
                  value={numberFormatter.format(data.purchase.totalClicks)}
                  highlight
                />
                <Stat
                  label={t('ctaUniqueClickers')}
                  value={numberFormatter.format(data.purchase.uniqueClickers)}
                />
                <Stat
                  label={t('ctaPurchaseDistinctArtworks')}
                  value={numberFormatter.format(data.purchase.distinctArtworks)}
                />
              </div>
            </AdminCard>

            {data.purchase.topArtworks.length > 0 && (
              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('ctaPurchaseTopTitle')}
                  </h3>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('ctaPurchaseArtworkColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaClicksColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaUniqueColumn')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.purchase.topArtworks.map((row) => (
                        <tr key={row.artworkId}>
                          <td className="px-4 py-2 text-gray-700">
                            <p className="font-medium text-gray-900 line-clamp-1">
                              {row.artworkTitle || row.artworkId}
                            </p>
                            <p className="text-xs text-gray-500 line-clamp-1">{row.artist}</p>
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

      {/* ========================== 언어 전환 ========================== */}
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{t('ctaLocaleSwitchTitle')}</h2>
          <p className="mt-1 text-sm text-gray-500">{t('ctaLocaleSwitchDesc')}</p>
        </div>

        {!hasLocaleSwitch ? (
          <AdminCard className="flex flex-col">
            <AdminEmptyState
              title={t('ctaLocaleSwitchNoData')}
              description={t('ctaLocaleSwitchNoDataDesc')}
            />
          </AdminCard>
        ) : (
          <>
            <AdminCard className="p-6">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Stat
                  label={t('ctaTotalSwitches')}
                  value={numberFormatter.format(data.localeSwitch.totalSwitches)}
                  highlight
                />
                <Stat
                  label={t('ctaUniqueSwitchers')}
                  value={numberFormatter.format(data.localeSwitch.uniqueSwitchers)}
                />
                <Stat
                  label={t('ctaKoToEn')}
                  value={numberFormatter.format(data.localeSwitch.koToEnSwitches)}
                />
                <Stat
                  label={t('ctaEnToKo')}
                  value={numberFormatter.format(data.localeSwitch.enToKoSwitches)}
                />
              </div>
            </AdminCard>

            {data.localeSwitch.topPages.length > 0 && (
              <AdminCard className="flex flex-col">
                <AdminCardHeader className="rounded-t-2xl">
                  <h3 className="text-base font-semibold text-gray-900">
                    {t('ctaLocaleSwitchPagesTitle')}
                  </h3>
                </AdminCardHeader>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-xs font-medium uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-2 text-left">{t('wvPagePathColumn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaKoToEn')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaEnToKo')}</th>
                        <th className="px-4 py-2 text-right">{t('ctaTotalSwitches')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 bg-white">
                      {data.localeSwitch.topPages.map((row) => (
                        <tr key={row.pagePath}>
                          <td className="px-4 py-2 font-mono text-xs text-gray-700">
                            {row.pagePath}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.koToEn)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums text-gray-600">
                            {numberFormatter.format(row.enToKo)}
                          </td>
                          <td className="px-4 py-2 text-right tabular-nums font-semibold text-gray-900">
                            {numberFormatter.format(row.total)}
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
