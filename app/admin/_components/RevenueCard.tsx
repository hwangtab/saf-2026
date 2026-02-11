'use client';

import { AdminCard } from './admin-ui';

type RevenueCardProps = {
  title: string;
  value: number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
};

export function RevenueCard({ title, value, subtitle, trend }: RevenueCardProps) {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);

  return (
    <AdminCard className="flex h-full flex-col justify-between p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">{formatted}</p>
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
            {trend.isPositive ? '▲' : '▼'} {Math.abs(trend.value)}%
          </span>
          <span className="ml-2 text-slate-500">지난달 대비</span>
        </div>
      )}
    </AdminCard>
  );
}
