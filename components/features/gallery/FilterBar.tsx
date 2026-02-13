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
  const statusOptions: Array<{ value: StatusFilter; label: string }> = [
    { value: 'all', label: UI_STRINGS.FILTERS.ALL },
    { value: 'selling', label: UI_STRINGS.FILTERS.SELLING },
    { value: 'sold', label: UI_STRINGS.FILTERS.SOLD },
  ];

  return (
    <div className="flex flex-row items-center gap-2 shrink-0 ml-auto">
      <fieldset className="flex bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
        <legend className="sr-only">{UI_STRINGS.A11Y.FILTER_STATUS}</legend>
        {statusOptions.map((option) => (
          <label
            key={option.value}
            className={`px-4 py-2.5 text-xs font-medium rounded-md transition-colors cursor-pointer focus-within:ring-2 focus-within:ring-primary/50 ${
              statusFilter === option.value
                ? 'bg-charcoal text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <input
              type="radio"
              name="artwork-status-filter"
              value={option.value}
              checked={statusFilter === option.value}
              onChange={() => setStatusFilter(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      <SortControls value={sortOption} onChange={setSortOption} />
    </div>
  );
}
