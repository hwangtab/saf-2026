'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AdminCard } from './admin-ui';
import { BRAND_COLORS } from '@/lib/colors';
import { DashboardStats } from '@/app/actions/admin-dashboard';

type StatusDonutChartProps = {
  data: DashboardStats['artworks'];
};

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const chartData = [
    {
      name: '판매 중(공개)',
      value: data.statusVisible.available,
      color: BRAND_COLORS.success.DEFAULT,
    },
    { name: '예약됨(공개)', value: data.statusVisible.reserved, color: BRAND_COLORS.sun.DEFAULT },
    {
      name: '판매 완료(공개)',
      value: data.statusVisible.sold,
      color: BRAND_COLORS.primary.DEFAULT,
    },
    { name: '숨김 작품', value: data.hidden, color: BRAND_COLORS.gray[400] },
  ].filter((item) => item.value > 0);

  const total = data.total;

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-gray-900">작품 공개/상태 분포</h3>
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
                border: `1px solid ${BRAND_COLORS.gray[200]}`,
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pb-8">
          <p className="text-sm font-medium text-gray-500">총 작품</p>
          <p className="text-2xl font-bold text-gray-900">{total}</p>
        </div>
      </div>
    </AdminCard>
  );
}
