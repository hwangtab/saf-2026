'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminFieldLabel, AdminSelect } from '@/app/admin/_components/admin-ui';

type RevenueFilterBarProps = {
  selectedYear: number;
  selectedMonth: number | 'all';
  availableYears: number[];
};

export function RevenueFilterBar({
  selectedYear,
  selectedMonth,
  availableYears,
}: RevenueFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const monthValue = selectedMonth === 'all' ? 'all' : String(selectedMonth);

  const updateFilters = (nextYear: number, nextMonth: number | 'all') => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', String(nextYear));
      params.set('month', nextMonth === 'all' ? 'all' : String(nextMonth));
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleYearChange = (value: string) => {
    const nextYear = Number(value);
    if (!Number.isInteger(nextYear)) return;
    updateFilters(nextYear, selectedMonth);
  };

  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      updateFilters(selectedYear, 'all');
      return;
    }

    const nextMonth = Number(value);
    if (!Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12) return;
    updateFilters(selectedYear, nextMonth);
  };

  return (
    <section className="rounded-2xl border border-[var(--admin-border)] bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <AdminFieldLabel htmlFor="revenue-year">연도</AdminFieldLabel>
          <AdminSelect
            id="revenue-year"
            value={String(selectedYear)}
            onChange={(event) => handleYearChange(event.target.value)}
            disabled={isPending}
          >
            {availableYears.map((year) => (
              <option key={year} value={year}>
                {year}년
              </option>
            ))}
          </AdminSelect>
        </div>
        <div>
          <AdminFieldLabel htmlFor="revenue-month">월</AdminFieldLabel>
          <AdminSelect
            id="revenue-month"
            value={monthValue}
            onChange={(event) => handleMonthChange(event.target.value)}
            disabled={isPending}
          >
            <option value="all">전체 월</option>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
              <option key={month} value={month}>
                {month}월
              </option>
            ))}
          </AdminSelect>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        회계 기준 시간대: KST (Asia/Seoul)
        {isPending ? ' · 필터 적용 중...' : ''}
      </p>
    </section>
  );
}
