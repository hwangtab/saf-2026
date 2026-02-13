'use client';

import nextDynamic from 'next/dynamic';

export const StatusDonutChart = nextDynamic(
  () => import('@/app/admin/_components/StatusDonutChart').then((mod) => mod.StatusDonutChart),
  { ssr: false }
);

export const MaterialBarChart = nextDynamic(
  () => import('@/app/admin/_components/MaterialBarChart').then((mod) => mod.MaterialBarChart),
  { ssr: false }
);

export const TrendLineChart = nextDynamic(
  () => import('@/app/admin/_components/TrendLineChart').then((mod) => mod.TrendLineChart),
  { ssr: false }
);

export const RevenueTrendChart = nextDynamic(
  () => import('@/app/admin/_components/RevenueTrendChart').then((mod) => mod.RevenueTrendChart),
  { ssr: false }
);
