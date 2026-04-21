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
        <button
          type="button"
          role="radio"
          aria-checked={selected === null}
          onClick={() => onSelect(null)}
          className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
            selected === null
              ? 'bg-charcoal text-white shadow-sm border-charcoal'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {tFilters('priceAll')}
          <span className="ml-1 opacity-60">{totalCount}</span>
        </button>

        {PRICE_BUCKETS.map((bucket) => {
          const count = countById.get(bucket.id) ?? 0;
          if (count === 0) return null;
          const isActive = selected === bucket.id;
          return (
            <button
              key={bucket.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelect(isActive ? null : bucket.id)}
              className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
                isActive
                  ? 'bg-charcoal text-white shadow-sm border-charcoal'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {getPriceBucketLabel(bucket, locale)}
              <span className="ml-1 opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
