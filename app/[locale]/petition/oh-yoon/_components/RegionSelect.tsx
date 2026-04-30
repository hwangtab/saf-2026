'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { REGIONS, getRegionLabel, getSubregionLabel, getSubregions } from '@/lib/petition/regions';

interface RegionSelectProps {
  topValue: string;
  subValue: string;
  onChange: (top: string, sub: string) => void;
  topId?: string;
  subId?: string;
  disabled?: boolean;
  required?: boolean;
}

const SELECT_BASE =
  'w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-base text-charcoal-deep ' +
  'focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ' +
  'disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed';

export default function RegionSelect({
  topValue,
  subValue,
  onChange,
  topId = 'petition-region-top',
  subId = 'petition-region-sub',
  disabled = false,
  required = true,
}: RegionSelectProps) {
  const locale = (useLocale() === 'en' ? 'en' : 'ko') as 'ko' | 'en';
  const t = useTranslations('petition.ohYoon');
  const subs = useMemo(() => getSubregions(topValue), [topValue]);
  const subRequired = required && subs.length > 0;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <select
        id={topId}
        value={topValue}
        onChange={(e) => onChange(e.target.value, '')}
        disabled={disabled}
        required={required}
        className={SELECT_BASE}
      >
        <option value="" disabled>
          {t('formRegionTopPlaceholder')}
        </option>
        {REGIONS.map((r) => (
          <option key={r.key} value={r.key}>
            {getRegionLabel(r, locale)}
          </option>
        ))}
      </select>

      <select
        id={subId}
        value={subValue}
        onChange={(e) => onChange(topValue, e.target.value)}
        disabled={disabled || subs.length === 0}
        required={subRequired}
        className={SELECT_BASE}
        aria-label={t('formRegionSubAriaLabel')}
      >
        <option value="">
          {subs.length === 0 ? t('formRegionSubNone') : t('formRegionSubPlaceholder')}
        </option>
        {subs.map((s) => (
          <option key={s} value={s}>
            {getSubregionLabel(topValue, s, locale)}
          </option>
        ))}
      </select>
    </div>
  );
}
