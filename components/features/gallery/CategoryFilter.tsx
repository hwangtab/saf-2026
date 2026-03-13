'use client';

import { useLocale } from 'next-intl';
import { getUIStrings } from '@/lib/ui-strings';
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
  const ui = getUIStrings(locale);

  return (
    <div role="radiogroup" aria-label={ui.A11Y.FILTER_CATEGORY}>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide md:flex-wrap md:justify-center md:overflow-x-visible">
        {/* "All" button */}
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
          {ui.FILTERS.CATEGORY_ALL}
          <span className="ml-1 opacity-60">{totalCount}</span>
        </button>

        {/* Category buttons */}
        {categories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            role="radio"
            aria-checked={selected === cat.value}
            onClick={() => onSelect(selected === cat.value ? null : cat.value)}
            className={`shrink-0 px-3 md:px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border text-center ${
              selected === cat.value
                ? 'bg-charcoal text-white shadow-sm border-charcoal'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {getCategoryLabel(cat.value, locale)}
            <span className="ml-1 opacity-60">{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
