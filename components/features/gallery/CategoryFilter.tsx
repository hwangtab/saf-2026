'use client';

import { useLocale, useTranslations } from 'next-intl';
import { getCategoryLabel } from '@/lib/artwork-category';
import { CategoryCount } from '@/lib/hooks/useArtworkFilter';

interface CategoryFilterProps {
  categories: CategoryCount[];
  selected: string | null;
  onSelect: (category: string | null) => void;
  totalCount: number;
}

export default function CategoryFilter({
  categories,
  selected,
  onSelect,
  totalCount,
}: CategoryFilterProps) {
  const locale = useLocale();
  const tFilters = useTranslations('filters');
  const tA11y = useTranslations('a11y');

  return (
    <div role="radiogroup" aria-label={tA11y('filterCategory')}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:justify-center">
        {/* "All" button */}
        <label
          className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
            selected === null
              ? 'bg-charcoal text-white shadow-sm border-charcoal'
              : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <input
            type="radio"
            name="artwork-category-filter"
            checked={selected === null}
            onChange={() => onSelect(null)}
            className="sr-only"
          />
          {tFilters('categoryAll')}
          <span className={`ml-1 ${selected === null ? 'text-white/80' : 'text-charcoal-soft'}`}>
            {totalCount}
          </span>
        </label>

        {/* Category buttons */}
        {categories.map((cat) => (
          <label
            key={cat.value}
            className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
              selected === cat.value
                ? 'bg-charcoal text-white shadow-sm border-charcoal'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            <input
              type="radio"
              name="artwork-category-filter"
              checked={selected === cat.value}
              onClick={() => {
                if (selected === cat.value) onSelect(null);
              }}
              onChange={() => onSelect(cat.value)}
              className="sr-only"
            />
            {getCategoryLabel(cat.value, locale)}
            <span
              className={`ml-1 ${selected === cat.value ? 'text-white/80' : 'text-charcoal-soft'}`}
            >
              {cat.count}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
