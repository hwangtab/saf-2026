'use client';

import { AdminCard } from './admin-ui';

type RevenueCardProps = {
  title: string;
  value: number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
};

function formatKoreanAmount(value: number) {
  const amount = Math.max(0, Math.round(value));
  if (amount === 0) return '0원';

  const eok = Math.floor(amount / 100000000);
  const man = Math.floor((amount % 100000000) / 10000);
  const won = amount % 10000;
  const parts: string[] = [];

  if (eok > 0) {
    parts.push(`${new Intl.NumberFormat('ko-KR').format(eok)}억`);
  }
  if (man > 0) {
    parts.push(`${new Intl.NumberFormat('ko-KR').format(man)}만`);
  }
  if (won > 0) {
    parts.push(`${new Intl.NumberFormat('ko-KR').format(won)}`);
  }

  return `${parts.join(' ')}원`;
}

export function RevenueCard({ title, value, subtitle, trend }: RevenueCardProps) {
  const formatted = new Intl.NumberFormat('ko-KR', {
    style: 'currency',
    currency: 'KRW',
    maximumFractionDigits: 0,
  }).format(value);
  const koreanFormatted = formatKoreanAmount(value);

  const trendValue =
    trend && Number.isInteger(Math.abs(trend.value))
      ? String(Math.abs(trend.value))
      : trend
        ? Math.abs(trend.value).toFixed(1)
        : null;

  return (
    <AdminCard className="flex h-full flex-col justify-between p-6">
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 whitespace-nowrap text-[clamp(2rem,6vw,3rem)] font-bold leading-none tracking-tight text-slate-900 tabular-nums">
          {formatted}
        </p>
        <p className="mt-1 text-xs font-medium text-slate-500">{koreanFormatted}</p>
      </div>
      {subtitle && <p className="mt-2 text-sm text-slate-500">{subtitle}</p>}
      {trend && (
        <div className="mt-4 flex items-center text-sm">
          <span className={trend.isPositive ? 'text-green-600' : 'text-red-600'}>
            {trend.isPositive ? '▲' : '▼'} {trendValue}%
          </span>
          <span className="ml-2 text-slate-500">직전 동일 기간 대비</span>
        </div>
      )}
    </AdminCard>
  );
}
