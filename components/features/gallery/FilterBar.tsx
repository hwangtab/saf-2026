import { StatusFilter } from '@/lib/hooks/useArtworkFilter';
import { SortOption } from '@/types';
import { UI_STRINGS } from '@/lib/ui-strings';
import SortControls from '../SortControls';

interface FilterBarProps {
  statusFilter: StatusFilter;
  setStatusFilter: (status: StatusFilter) => void;
  sortOption: SortOption;
  setSortOption: (option: SortOption) => void;
}

export default function FilterBar({
  statusFilter,
  setStatusFilter,
  sortOption,
  setSortOption,
}: FilterBarProps) {
  return (
    <div className="flex flex-row items-center gap-2 shrink-0 ml-auto">
      <div
        role="radiogroup"
        aria-label={UI_STRINGS.A11Y.FILTER_STATUS}
        className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm"
      >
        <button
          role="radio"
          aria-checked={statusFilter === 'all'}
          onClick={() => setStatusFilter('all')}
          className={`px-4 py-2.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'all'
              ? 'bg-charcoal text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {UI_STRINGS.FILTERS.ALL}
        </button>
        <button
          role="radio"
          aria-checked={statusFilter === 'selling'}
          onClick={() => setStatusFilter('selling')}
          className={`px-4 py-2.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'selling'
              ? 'bg-charcoal text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {UI_STRINGS.FILTERS.SELLING}
        </button>
        <button
          role="radio"
          aria-checked={statusFilter === 'sold'}
          onClick={() => setStatusFilter('sold')}
          className={`px-4 py-2.5 text-xs font-medium rounded-md transition-colors ${
            statusFilter === 'sold'
              ? 'bg-charcoal text-white shadow-sm'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          {UI_STRINGS.FILTERS.SOLD}
        </button>
      </div>

      <SortControls value={sortOption} onChange={setSortOption} />
    </div>
  );
}
