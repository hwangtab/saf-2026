'use client';

import { useLocale } from 'next-intl';
import { getUIStrings } from '@/lib/ui-strings';
import { CategoryCount } from '@/lib/hooks/useArtworkFilter';

const CATEGORY_EN_MAP: Record<string, string> = {
  회화: 'Painting',
  한국화: 'Korean Painting',
  판화: 'Printmaking',
  사후판화: 'Posthumous Print',
  드로잉: 'Drawing',
  조각: 'Sculpture',
  '도자/공예': 'Ceramics/Craft',
  사진: 'Photography',
  아트프린트: 'Art Print',
  혼합매체: 'Mixed Media',
  디지털아트: 'Digital Art',
};

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

  const getCategoryLabel = (value: string) => {
    if (locale === 'en') {
      return CATEGORY_EN_MAP[value] || value;
    }
    return value;
  };

  return (
    <div role="radiogroup" aria-label={ui.A11Y.FILTER_CATEGORY}>
      <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-x-visible scrollbar-hide">
        {/* "All" button */}
        <button
          type="button"
          role="radio"
          aria-checked={selected === null}
          onClick={() => onSelect(null)}
          className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${
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
            className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap border ${
              selected === cat.value
                ? 'bg-charcoal text-white shadow-sm border-charcoal'
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-100'
            }`}
          >
            {getCategoryLabel(cat.value)}
            <span className="ml-1 opacity-60">{cat.count}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
