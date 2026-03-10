'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

type Props = {
  data: AnalyticsData['topPages'];
};

function truncatePath(path: string, maxLen = 30): string {
  if (path.length <= maxLen) return path;
  return path.slice(0, maxLen - 1) + '\u2026';
}

export function TopPagesChart({ data }: Props) {
  const chartData = data.slice(0, 10).map((item) => ({
    path: truncatePath(item.path),
    fullPath: item.path,
    views: item.views,
  }));

  if (chartData.length === 0) {
    return (
      <AdminCard className="flex h-full flex-col p-6">
        <h3 className="mb-4 text-lg font-semibold text-slate-900">인기 페이지</h3>
        <div className="flex flex-1 min-h-[300px] items-center justify-center">
          <p className="text-sm text-slate-500">데이터가 없습니다.</p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">인기 페이지</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="path"
              width={140}
              tick={{ fontSize: 11, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={{ fill: '#f1f5f9' }}
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [`${value.toLocaleString('ko-KR')}회`, '페이지뷰']}
            />
            <Bar dataKey="views" fill="#e63946" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
}
