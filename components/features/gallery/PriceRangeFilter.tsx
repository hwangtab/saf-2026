'use client';

import { useLocale, useTranslations } from 'next-intl';
import {
  PRICE_BUCKETS,
  getPriceBucketLabel,
  type PriceBucketId,
} from '@/lib/artwork-price-buckets';
import type { PriceBucketCount } from '@/lib/hooks/useArtworkFilter';

interface PriceRangeFilterProps {
  buckets: PriceBucketCount[];
  selected: PriceBucketId | null;
  onSelect: (bucket: PriceBucketId | null) => void;
  totalCount: number;
}

export default function PriceRangeFilter({
  buckets,
  selected,
  onSelect,
  totalCount,
}: PriceRangeFilterProps) {
  const locale = useLocale();
  const tFilters = useTranslations('filters');
  const tA11y = useTranslations('a11y');
  const countById = new Map(buckets.map((b) => [b.id, b.count]));

  return (
    <div role="radiogroup" aria-label={tA11y('filterPrice')}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap md:justify-center md:overflow-x-visible">
        <label
          className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
            selected === null
              ? 'bg-charcoal text-white shadow-sm border-charcoal'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <input
            type="radio"
            name="artwork-price-filter"
            checked={selected === null}
            onChange={() => onSelect(null)}
            className="sr-only"
          />
          {tFilters('priceAll')}
          <span className={`ml-1 ${selected === null ? 'text-white/80' : 'text-charcoal-soft'}`}>
            {totalCount}
          </span>
        </label>

        {PRICE_BUCKETS.map((bucket) => {
          const count = countById.get(bucket.id) ?? 0;
          if (count === 0) return null;
          const isActive = selected === bucket.id;
          return (
            <label
              key={bucket.id}
              className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
                isActive
                  ? 'bg-charcoal text-white shadow-sm border-charcoal'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <input
                type="radio"
                name="artwork-price-filter"
                checked={isActive}
                onClick={() => {
                  if (isActive) onSelect(null);
                }}
                onChange={() => onSelect(bucket.id)}
                className="sr-only"
              />
              {getPriceBucketLabel(bucket, locale)}
              <span className={`ml-1 ${isActive ? 'text-white/80' : 'text-charcoal-soft'}`}>
                {count}
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
