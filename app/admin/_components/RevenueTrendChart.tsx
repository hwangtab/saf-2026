'use client';

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { DashboardStats } from '@/app/actions/admin-dashboard';
import { AdminCard } from './admin-ui';

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const COMPACT_KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

type RevenueTrendChartProps = {
  data: DashboardStats['revenue']['timeSeries'];
  periodLabel: string;
};

type RevenueTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: DashboardStats['revenue']['timeSeries'][number];
  }>;
};

function RevenueTooltip({ active, payload }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-800">
        {point.startDate} ~ {point.endDate}
      </p>
      <p className="mt-1 text-slate-600">매출: {KRW_FORMATTER.format(point.revenue)}</p>
      <p className="text-slate-600">판매 작품: {NUMBER_FORMATTER.format(point.soldCount)}개</p>
      <p className="text-slate-600">평균판매가: {KRW_FORMATTER.format(point.averagePrice)}</p>
    </div>
  );
}

export function RevenueTrendChart({ data, periodLabel }: RevenueTrendChartProps) {
  const hasData = data.some((item) => item.revenue > 0 || item.soldCount > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="text-lg font-semibold text-slate-900">기간별 매출/평균판매가</h3>
      <p className="mt-1 text-xs text-slate-500">{periodLabel}</p>
      <div className="relative mt-4 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 22, left: 8, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => COMPACT_KRW_FORMATTER.format(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(value) => COMPACT_KRW_FORMATTER.format(value)}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Legend verticalAlign="top" align="right" height={30} iconType="circle" />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="revenue"
              name="매출"
              fill="#bfdbfe"
              fillOpacity={0.7}
              stroke="#2563eb"
              strokeWidth={2}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="averagePrice"
              name="평균판매가"
              stroke="#dc2626"
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        {!hasData && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <p className="rounded-full bg-white/90 px-3 py-1 text-xs text-slate-500">
              선택한 기간의 판매 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
