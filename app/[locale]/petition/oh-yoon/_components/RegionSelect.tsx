'use client';

import { useMemo } from 'react';
import { REGIONS, getSubregions } from '@/lib/petition/regions';

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
          시·도 선택
        </option>
        {REGIONS.map((r) => (
          <option key={r.key} value={r.key}>
            {r.label}
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
        aria-label="시·군·구"
      >
        <option value="">{subs.length === 0 ? '해당 없음' : '시·군·구 선택'}</option>
        {subs.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
    </div>
  );
}
