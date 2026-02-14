'use client';

import nextDynamic from 'next/dynamic';

export const MonthlyRevenueChart = nextDynamic(
  () =>
    import('@/app/admin/revenue/_components/MonthlyRevenueChart').then(
      (mod) => mod.MonthlyRevenueChart
    ),
  { ssr: false }
);
