'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import type { AnalyticsPeriod } from '@/app/actions/admin-analytics';

const PERIODS: { value: AnalyticsPeriod; label: string }[] = [
  { value: '7d', label: '7일' },
  { value: '30d', label: '30일' },
  { value: '90d', label: '90일' },
];

type Props = {
  selected: AnalyticsPeriod;
};

export function AnalyticsPeriodTabs({ selected }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handleClick = (period: AnalyticsPeriod) => {
    if (period === selected) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('period', period);
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-[var(--admin-border)] bg-white/90 p-1 shadow-sm">
      {PERIODS.map(({ value, label }) => (
        <button
          type="button"
          key={value}
          onClick={() => handleClick(value)}
          disabled={isPending}
          className={clsx(
            'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
            value === selected
              ? 'bg-primary-a11y text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          )}
        >
          {label}
        </button>
      ))}
      {isPending && <span className="ml-2 text-xs text-gray-400">불러오는 중...</span>}
    </div>
  );
}
