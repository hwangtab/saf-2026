'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import { BRAND_COLORS } from '@/lib/colors';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

type Props = {
  browserData: AnalyticsData['browserDistribution'];
  osData: AnalyticsData['osDistribution'];
};

export function BrowserOsChart({ browserData, osData }: Props) {
  const hasBrowser = browserData.some((d) => d.count > 0);
  const hasOs = osData.some((d) => d.count > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">브라우저 / OS 분포</h3>
      {!hasBrowser && !hasOs ? (
        <div className="flex flex-1 min-h-[300px] items-center justify-center">
          <p className="text-sm text-gray-500">데이터가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 브라우저 */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">브라우저</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={browserData.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={BRAND_COLORS.gray[200]}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: BRAND_COLORS.gray[500] }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="browser"
                    tick={{ fontSize: 11, fill: BRAND_COLORS.gray[500] }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('ko-KR')}회`, '방문']}
                  />
                  <Bar dataKey="count" fill={BRAND_COLORS.primary.a11y} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {/* OS */}
          <div>
            <p className="mb-2 text-sm font-medium text-gray-500">운영체제</p>
            <div className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={osData.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke={BRAND_COLORS.gray[200]}
                  />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: BRAND_COLORS.gray[500] }}
                    allowDecimals={false}
                  />
                  <YAxis
                    type="category"
                    dataKey="os"
                    tick={{ fontSize: 11, fill: BRAND_COLORS.gray[500] }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      borderRadius: '8px',
                      border: `1px solid ${BRAND_COLORS.gray[200]}`,
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                    }}
                    formatter={(value: number) => [`${value.toLocaleString('ko-KR')}회`, '방문']}
                  />
                  <Bar dataKey="count" fill={BRAND_COLORS.primary.DEFAULT} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </AdminCard>
  );
}
