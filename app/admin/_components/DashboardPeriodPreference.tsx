'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'admin_dashboard_period';
const VALID_PERIODS = new Set(['7d', '30d', '90d', '365d', 'all']);

type DashboardPeriodPreferenceProps = {
  selectedPeriod: string;
};

export function DashboardPeriodPreference({ selectedPeriod }: DashboardPeriodPreferenceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const hasPeriodInQuery = searchParams.has('period');

  useEffect(() => {
    if (!hasPeriodInQuery) return;
    if (!VALID_PERIODS.has(selectedPeriod)) return;
    localStorage.setItem(STORAGE_KEY, selectedPeriod);
  }, [hasPeriodInQuery, selectedPeriod]);

  useEffect(() => {
    if (hasPeriodInQuery) return;

    const savedPeriod = localStorage.getItem(STORAGE_KEY);
    if (!savedPeriod || !VALID_PERIODS.has(savedPeriod)) return;
    if (savedPeriod === selectedPeriod) return;

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set('period', savedPeriod);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    router.refresh();
  }, [hasPeriodInQuery, pathname, router, searchParamsString, selectedPeriod]);

  return null;
}
