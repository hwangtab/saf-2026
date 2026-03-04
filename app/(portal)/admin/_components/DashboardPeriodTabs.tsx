'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import type { DashboardPeriodKey } from '@/app/actions/admin-dashboard';

type DashboardPeriodTabsProps = {
  selectedPeriod: DashboardPeriodKey;
  options: Array<{ key: DashboardPeriodKey; label: string }>;
};

export function DashboardPeriodTabs({ selectedPeriod, options }: DashboardPeriodTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const handlePeriodClick = (period: DashboardPeriodKey) => {
    if (period === selectedPeriod) return;

    startTransition(() => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('period', period);
      router.push(`${pathname}?${nextParams.toString()}`, { scroll: false });
      router.refresh();
    });
  };

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isActive = option.key === selectedPeriod;
        return (
          <button
            key={option.key}
            type="button"
            onClick={() => handlePeriodClick(option.key)}
            disabled={isPending}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              isActive
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700'
                : 'border-slate-300 bg-white text-slate-600 hover:border-slate-400 hover:text-slate-800'
            } ${isPending ? 'cursor-wait opacity-80' : ''}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
