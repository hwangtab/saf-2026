'use client';

import { useMemo } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { REGIONS, getRegionLabel, getSubregionLabel, getSubregions } from '@/lib/petition/regions';
import Select from '@/components/ui/Select';

interface RegionSelectProps {
  topValue: string;
  subValue: string;
  onChange: (top: string, sub: string) => void;
  topId?: string;
  subId?: string;
  disabled?: boolean;
  required?: boolean;
}

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
      <Select
        id={topId}
        value={topValue}
        onChange={(e) => onChange(e.target.value, '')}
        disabled={disabled}
        required={required}
      >
        <option value="" disabled>
          {t('formRegionTopPlaceholder')}
        </option>
        {REGIONS.map((r) => (
          <option key={r.key} value={r.key}>
            {getRegionLabel(r, locale)}
          </option>
        ))}
      </Select>

      <Select
        id={subId}
        value={subValue}
        onChange={(e) => onChange(topValue, e.target.value)}
        disabled={disabled || subs.length === 0}
        required={subRequired}
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
      </Select>
    </div>
  );
}
