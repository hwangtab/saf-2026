'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const STORAGE_KEY = 'admin_dashboard_period';
const VALID_PERIODS = new Set(['7d', '30d', '90d', '365d', 'all']);
const YEAR_PERIOD_REGEX = /^year_\d{4}$/;

function isValidPeriod(value: string): boolean {
  if (VALID_PERIODS.has(value)) return true;
  if (!YEAR_PERIOD_REGEX.test(value)) return false;

  const match = /^year_(\d{4})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const currentYear = new Date().getFullYear();
  return year >= currentYear - 2 && year <= currentYear;
}

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
    if (!isValidPeriod(selectedPeriod)) return;
    localStorage.setItem(STORAGE_KEY, selectedPeriod);
  }, [hasPeriodInQuery, selectedPeriod]);

  useEffect(() => {
    if (hasPeriodInQuery) return;

    const savedPeriod = localStorage.getItem(STORAGE_KEY);
    if (!savedPeriod || !isValidPeriod(savedPeriod)) return;
    if (savedPeriod === selectedPeriod) return;

    const nextParams = new URLSearchParams(searchParamsString);
    nextParams.set('period', savedPeriod);
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    router.refresh();
  }, [hasPeriodInQuery, pathname, router, searchParamsString, selectedPeriod]);

  return null;
}
