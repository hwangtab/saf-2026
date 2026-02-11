'use client';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { AdminCard } from './admin-ui';
import { DashboardStats } from '@/app/actions/admin-dashboard';

type MaterialBarChartProps = {
  data: DashboardStats['materialDistribution'];
};

export function MaterialBarChart({ data }: MaterialBarChartProps) {
  const chartData = data.slice(0, 5);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">재료별 분포</h3>
      <div className="flex-1 min-h-[300px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={chartData}
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <XAxis type="number" hide />
            <YAxis
              type="category"
              dataKey="material"
              width={100}
              tick={{ fontSize: 12, fill: '#64748b' }}
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
            />
            <Bar dataKey="count" fill="#e63946" radius={[0, 4, 4, 0]} barSize={20} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </AdminCard>
  );
}
