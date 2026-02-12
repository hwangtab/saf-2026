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
import { AdminCard } from './admin-ui';
import { DashboardStats } from '@/app/actions/admin-dashboard';

type TrendLineChartProps = {
  data: DashboardStats['trends'];
};

export function TrendLineChart({ data }: TrendLineChartProps) {
  const merged = new Map<string, { newArtists: number; newArtworks: number }>();

  data.dailyArtists.forEach((item) => {
    const current = merged.get(item.date) || { newArtists: 0, newArtworks: 0 };
    merged.set(item.date, { ...current, newArtists: item.count });
  });

  data.dailyArtworks.forEach((item) => {
    const current = merged.get(item.date) || { newArtists: 0, newArtworks: 0 };
    merged.set(item.date, { ...current, newArtworks: item.count });
  });

  const filledData = Array.from(merged.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-31)
    .map(([dateKey, counts]) => {
      const d = new Date(dateKey);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return {
        date: `${month}.${day}`,
        fullDate: dateKey,
        newArtists: counts.newArtists,
        newArtworks: counts.newArtworks,
      };
    });

  const hasTrendData = filledData.some((item) => item.newArtists > 0 || item.newArtworks > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">신규 가입 및 작품 등록 추이</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={filledData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
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
              name="신규 작가"
              type="monotone"
              dataKey="newArtists"
              stroke="#e63946"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
            <Line
              name="신규 작품"
              type="monotone"
              dataKey="newArtworks"
              stroke="#a8dadc"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
        {!hasTrendData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-white/90 px-3 py-1 text-xs text-slate-500">
              최근 30일 신규 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
