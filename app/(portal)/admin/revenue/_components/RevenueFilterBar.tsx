'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { AdminFieldLabel, AdminSelect } from '@/app/admin/_components/admin-ui';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';

type RevenueFilterBarProps = {
  selectedYear: number;
  selectedMonth: number | 'all';
  availableYears: number[];
  selectedExhibition?: string | null;
};

export function RevenueFilterBar({
  selectedYear,
  selectedMonth,
  availableYears,
  selectedExhibition,
}: RevenueFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const monthValue = selectedMonth === 'all' ? 'all' : String(selectedMonth);
  const exhibitionValue = selectedExhibition || 'all';

  const updateFilters = (nextYear: number, nextMonth: number | 'all', nextExhibition: string) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('year', String(nextYear));
      params.set('month', nextMonth === 'all' ? 'all' : String(nextMonth));
      if (nextExhibition === 'all') {
        params.delete('exhibition');
      } else {
        params.set('exhibition', nextExhibition);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  };

  const handleYearChange = (value: string) => {
    const nextYear = Number(value);
    if (!Number.isInteger(nextYear)) return;
    updateFilters(nextYear, selectedMonth, exhibitionValue);
  };

  const handleMonthChange = (value: string) => {
    if (value === 'all') {
      updateFilters(selectedYear, 'all', exhibitionValue);
      return;
    }

    const nextMonth = Number(value);
    if (!Number.isInteger(nextMonth) || nextMonth < 1 || nextMonth > 12) return;
    updateFilters(selectedYear, nextMonth, exhibitionValue);
  };

  const handleExhibitionChange = (value: string) => {
    updateFilters(selectedYear, selectedMonth, value);
  };

  return (
    <section className="rounded-2xl border border-[var(--admin-border)] bg-white/90 p-4 shadow-sm sm:p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <div>
          <AdminFieldLabel htmlFor="revenue-exhibition">전시</AdminFieldLabel>
          <AdminSelect
            id="revenue-exhibition"
            value={exhibitionValue}
            onChange={(event) => handleExhibitionChange(event.target.value)}
            disabled={isPending}
          >
            <option value="all">전체</option>
            <option value="regular">상시</option>
            <option value={OH_YOON_TERRACOTTA_EXHIBITION.slug}>
              {OH_YOON_TERRACOTTA_EXHIBITION.labelKo}
            </option>
          </AdminSelect>
        </div>
      </div>
      <p className="mt-3 text-xs text-gray-500">
        회계 기준 시간대: KST (Asia/Seoul)
        {isPending ? ' · 필터 적용 중...' : ''}
      </p>
    </section>
  );
}
