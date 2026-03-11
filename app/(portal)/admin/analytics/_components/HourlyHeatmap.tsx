'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

type Props = {
  data: AnalyticsData['hourlyDistribution'];
};

export function HourlyHeatmap({ data }: Props) {
  const formatted = data.map((item) => ({
    시간: `${String(item.hour).padStart(2, '0')}시`,
    페이지뷰: item.views,
    방문자: item.visitors,
  }));

  const hasData = formatted.some((item) => item.페이지뷰 > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">시간대별 방문 (KST)</h3>
      <div className="relative h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={formatted} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="시간"
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Bar name="페이지뷰" dataKey="페이지뷰" fill="#e63946" radius={[4, 4, 0, 0]} />
            <Bar name="방문자" dataKey="방문자" fill="#a8dadc" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-white/90 px-3 py-1 text-xs text-slate-500">
              해당 기간 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
