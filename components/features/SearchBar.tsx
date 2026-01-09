'use client';

import { SearchIcon, CloseIcon } from '@/components/ui/Icons';
import { UI_STRINGS } from '@/lib/ui-strings';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = UI_STRINGS.SEARCH.PLACEHOLDER_DEFAULT,
}: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="artwork-search" className="sr-only">
        {UI_STRINGS.A11Y.SEARCH_LABEL}
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-600" />
      </div>
      <input
        type="text"
        id="artwork-search"
        aria-label={UI_STRINGS.A11Y.SEARCH_LABEL}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-600 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-primary focus:border-primary text-base sm:text-sm transition-colors"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 focus:outline-none"
          type="button"
          aria-label={UI_STRINGS.A11Y.CLEAR_SEARCH}
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
