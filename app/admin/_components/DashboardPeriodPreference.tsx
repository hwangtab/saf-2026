'use client';

import { useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type DashboardPeriodPreferenceProps = {
  selectedPeriod: string;
};

export function DashboardPeriodPreference({ selectedPeriod }: DashboardPeriodPreferenceProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = searchParams.toString();
  const hasPeriodInQuery = searchParams.has('period');
  const periodInQuery = searchParams.get('period');

  useEffect(() => {
    if (hasPeriodInQuery && periodInQuery !== selectedPeriod) {
      const nextParams = new URLSearchParams(searchParamsString);
      nextParams.set('period', selectedPeriod);
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      router.refresh();
      return;
    }
  }, [hasPeriodInQuery, pathname, periodInQuery, router, searchParamsString, selectedPeriod]);

  return null;
}
