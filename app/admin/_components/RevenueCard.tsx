'use client';

import { AdminCard } from './admin-ui';

type RevenueCardProps = {
  title: string;
  value: number;
  subtitle?: string;
  trend?: { value: number; isPositive: boolean };
};

const KRW_FORMATTER = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const KO_NUMBER_FORMATTER = new Intl.NumberFormat('ko-KR');

function formatKoreanAmount(value: number) {
  const amount = Math.max(0, Math.round(value));
  if (amount === 0) return '0원';

  const eok = Math.floor(amount / 100000000);
  const man = Math.floor((amount % 100000000) / 10000);
  const won = amount % 10000;
  const parts: string[] = [];

  if (eok > 0) {
    parts.push(`${KO_NUMBER_FORMATTER.format(eok)}억`);
  }
  if (man > 0) {
    parts.push(`${KO_NUMBER_FORMATTER.format(man)}만`);
  }
  if (won > 0) {
    parts.push(`${KO_NUMBER_FORMATTER.format(won)}`);
  }

  return `${parts.join(' ')}원`;
}

export function RevenueCard({ title, value, subtitle, trend }: RevenueCardProps) {
  const formatted = KRW_FORMATTER.format(value);
  const koreanFormatted = formatKoreanAmount(value);
  const digitCount = formatted.replace(/[^\d]/g, '').length;
  const useKoreanPrimary = digitCount >= 12;
  const primaryValue = useKoreanPrimary ? koreanFormatted : formatted;
  const secondaryValue = useKoreanPrimary ? formatted : koreanFormatted;

  const valueSizeClass =
    primaryValue.length >= 14
      ? 'text-[clamp(1.35rem,2.3vw,2.25rem)]'
      : primaryValue.length >= 11
        ? 'text-[clamp(1.5rem,2.7vw,2.5rem)]'
        : primaryValue.length >= 8
          ? 'text-[clamp(1.7rem,3.2vw,2.75rem)]'
          : 'text-[clamp(1.9rem,4vw,3rem)]';

  const subtitleTextSizeClass = secondaryValue.length >= 16 ? 'text-[11px] sm:text-xs' : 'text-xs';

  const valueWrapClass =
    primaryValue.length >= 14 ? 'whitespace-normal break-words' : 'whitespace-nowrap';

  const trendValue =
    trend && Number.isInteger(Math.abs(trend.value))
      ? String(Math.abs(trend.value))
      : trend
        ? Math.abs(trend.value).toFixed(1)
        : null;

  return (
    <AdminCard className="flex h-full min-w-0 flex-col justify-between p-6">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p
          className={`mt-2 min-w-0 max-w-full font-bold leading-[1.05] tracking-tight text-slate-900 tabular-nums ${valueSizeClass} ${valueWrapClass}`}
        >
          {primaryValue}
        </p>
        <p className={`mt-1 font-medium text-slate-500 ${subtitleTextSizeClass}`}>
          {secondaryValue}
        </p>
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
