'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AdminCard } from '@/app/admin/_components/admin-ui';
import type { AnalyticsData } from '@/app/actions/admin-analytics';

type Props = {
  data: AnalyticsData['deviceDistribution'];
};

const DEVICE_LABELS: Record<string, string> = {
  desktop: '데스크톱',
  mobile: '모바일',
  tablet: '태블릿',
  unknown: '기타',
};

const DEVICE_COLORS: Record<string, string> = {
  desktop: '#3b82f6',
  mobile: '#10b981',
  tablet: '#f59e0b',
  unknown: '#8F98A5',
};

export function DevicePieChart({ data }: Props) {
  const chartData = data.map((item) => ({
    name: DEVICE_LABELS[item.type] || item.type,
    value: item.count,
    color: DEVICE_COLORS[item.type] || '#8F98A5',
  }));

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <AdminCard className="flex h-full flex-col p-6">
        <h3 className="mb-4 text-lg font-semibold text-gray-900">디바이스 분포</h3>
        <div className="flex flex-1 min-h-[300px] items-center justify-center">
          <p className="text-sm text-gray-500">데이터가 없습니다.</p>
        </div>
      </AdminCard>
    );
  }

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">디바이스 분포</h3>
      <div className="relative flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid #D1D7E0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
              formatter={(value: number) => [`${value.toLocaleString('ko-KR')}회`, '방문']}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pb-8">
          <p className="text-sm font-medium text-gray-500">총 방문</p>
          <p className="text-2xl font-bold text-gray-900">{total.toLocaleString('ko-KR')}</p>
        </div>
      </div>
    </AdminCard>
  );
}
