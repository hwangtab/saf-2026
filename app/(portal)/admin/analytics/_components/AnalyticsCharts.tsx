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

export const BrowserOsChart = nextDynamic(
  () =>
    import('@/app/admin/analytics/_components/BrowserOsChart').then((mod) => mod.BrowserOsChart),
  { ssr: false }
);

export const HourlyHeatmap = nextDynamic(
  () => import('@/app/admin/analytics/_components/HourlyHeatmap').then((mod) => mod.HourlyHeatmap),
  { ssr: false }
);

export const AnalyticsCsvExport = nextDynamic(
  () =>
    import('@/app/admin/analytics/_components/AnalyticsCsvExport').then(
      (mod) => mod.AnalyticsCsvExport
    ),
  { ssr: false }
);
