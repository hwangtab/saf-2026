'use client';

import { useTranslations } from 'next-intl';
import { SizeBucketCount } from '@/lib/hooks/useArtworkFilter';

// size_bucket id → filters 네임스페이스 i18n 키
const LABEL_KEY: Record<string, string> = {
  small: 'sizeSmall',
  medium: 'sizeMedium',
  large: 'sizeLarge',
  xlarge: 'sizeXlarge',
  object: 'sizeObject',
};

interface SizeBucketFilterProps {
  buckets: SizeBucketCount[];
  selected: string | null;
  onSelect: (bucket: string | null) => void;
  totalCount: number;
}

export default function SizeBucketFilter({
  buckets,
  selected,
  onSelect,
  totalCount,
}: SizeBucketFilterProps) {
  const tFilters = useTranslations('filters');
  const tA11y = useTranslations('a11y');

  // 0건 구간은 useArtworkFilter에서 이미 제외됨 — 표시할 구간이 없으면 렌더 생략
  if (buckets.length === 0) return null;

  return (
    <div role="radiogroup" aria-label={tA11y('filterSize')}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:justify-center">
        {/* "전체 크기" button */}
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
          {tFilters('sizeAll')}
          <span className={`ml-1 ${selected === null ? 'text-white/80' : 'text-charcoal-soft'}`}>
            {totalCount}
          </span>
        </button>

        {/* Size bucket buttons */}
        {buckets.map((bucket) => (
          <button
            key={bucket.id}
            type="button"
            role="radio"
            aria-checked={selected === bucket.id}
            onClick={() => onSelect(selected === bucket.id ? null : bucket.id)}
            className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
              selected === bucket.id
                ? 'bg-charcoal text-white shadow-sm border-charcoal'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {tFilters(LABEL_KEY[bucket.id] ?? 'sizeAll')}
            <span
              className={`ml-1 ${selected === bucket.id ? 'text-white/80' : 'text-charcoal-soft'}`}
            >
              {bucket.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
