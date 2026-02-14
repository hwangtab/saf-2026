'use client';

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { RevenueAnalytics } from '@/app/actions/admin-revenue';
import { AdminCard } from '@/app/admin/_components/admin-ui';

const KRW_COMPACT_FORMATTER = new Intl.NumberFormat('ko-KR', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

type MonthlyRevenueChartProps = {
  data: RevenueAnalytics['chart'];
};

type RevenueTooltipProps = {
  active?: boolean;
  payload?: Array<{
    payload: RevenueAnalytics['chart'][number];
  }>;
};

function RevenueTooltip({ active, payload }: RevenueTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-sm">
      <p className="font-semibold text-slate-800">{point.label}</p>
      <p className="mt-1 text-slate-600">인식매출: {KRW_FORMATTER.format(point.revenue)}</p>
      <p className="text-slate-600">판매수량: {NUMBER_FORMATTER.format(point.soldCount)}점</p>
      <p className="text-slate-600">평균단가: {KRW_FORMATTER.format(point.averagePrice)}</p>
    </div>
  );
}

export function MonthlyRevenueChart({ data }: MonthlyRevenueChartProps) {
  const hasData = data.some((item) => item.revenue > 0 || item.soldCount > 0);

  return (
    <AdminCard className="flex h-full flex-col p-6">
      <h3 className="text-lg font-semibold text-slate-900">월별 인식매출/판매수량 추이</h3>
      <p className="mt-1 text-xs text-slate-500">KST 기준 월 단위 집계</p>
      <div className="relative mt-4 h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 18, left: 10, bottom: 8 }}>
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
              tickFormatter={(value) => KRW_COMPACT_FORMATTER.format(value)}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 12, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<RevenueTooltip />} />
            <Legend verticalAlign="top" align="right" height={30} iconType="circle" />
            <Bar
              yAxisId="left"
              dataKey="revenue"
              name="인식매출"
              fill="#2563eb"
              radius={[5, 5, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="soldCount"
              name="판매수량"
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
              선택한 조건의 매출 데이터가 없습니다.
            </p>
          </div>
        )}
      </div>
    </AdminCard>
  );
}
