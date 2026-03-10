'use client';

import nextDynamic from 'next/dynamic';

export const DailyViewsChart = nextDynamic(
  () =>
    import('@/app/admin/analytics/_components/DailyViewsChart').then((mod) => mod.DailyViewsChart),
  { ssr: false }
);

export const TopPagesChart = nextDynamic(
  () => import('@/app/admin/analytics/_components/TopPagesChart').then((mod) => mod.TopPagesChart),
  { ssr: false }
);

export const DevicePieChart = nextDynamic(
  () =>
    import('@/app/admin/analytics/_components/DevicePieChart').then((mod) => mod.DevicePieChart),
  { ssr: false }
);
