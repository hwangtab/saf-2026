'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { AdminCard } from './admin-ui';
import { DashboardStats } from '@/app/actions/admin-dashboard';

type StatusDonutChartProps = {
  data: DashboardStats['artworks'];
};

export function StatusDonutChart({ data }: StatusDonutChartProps) {
  const chartData = [
    { name: '판매 중', value: data.available, color: '#10b981' },
    { name: '예약됨', value: data.reserved, color: '#f59e0b' },
    { name: '판매 완료', value: data.sold, color: '#3b82f6' },
  ].filter((item) => item.value > 0);

  const total = data.total;

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">작품 상태 분포</h3>
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
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              }}
            />
            <Legend verticalAlign="bottom" height={36} iconType="circle" />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center pb-8">
          <p className="text-sm font-medium text-slate-500">총 작품</p>
          <p className="text-2xl font-bold text-slate-900">{total}</p>
        </div>
      </div>
    </AdminCard>
  );
}
