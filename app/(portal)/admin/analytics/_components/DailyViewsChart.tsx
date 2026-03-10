'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

type Props = {
  data: AnalyticsData['dailyTrend'];
};

export function DailyViewsChart({ data }: Props) {
  const formatted = data.map((item) => {
    const d = new Date(item.date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return {
      date: `${month}.${day}`,
      fullDate: item.date,
      페이지뷰: item.views,
      방문자: item.visitors,
    };
  });

  const hasData = formatted.some((item) => item.페이지뷰 > 0 || item.방문자 > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">일별 페이지뷰 추이</h3>
      <div className="relative h-[320px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={formatted} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              padding={{ left: 10, right: 10 }}
            />
            <YAxis
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
              domain={[0, 'dataMax + 1']}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend verticalAlign="top" align="right" height={36} iconType="circle" />
            <Line
              name="페이지뷰"
              type="monotone"
              dataKey="페이지뷰"
              stroke="#e63946"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 6 }}
            />
            <Line
              name="순 방문자"
              type="monotone"
              dataKey="방문자"
              stroke="#a8dadc"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
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
