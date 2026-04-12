'use client';

import { SearchIcon, CloseIcon } from '@/components/ui/Icons';
import { useTranslations } from 'next-intl';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({ value, onChange, placeholder }: SearchBarProps) {
  const tSearch = useTranslations('search');
  const tA11y = useTranslations('a11y');
  const resolvedPlaceholder = placeholder ?? tSearch('placeholderDefault');

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="artwork-search" className="sr-only">
        {tA11y('searchLabel')}
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-600" />
      </div>
      <input
        type="text"
        id="artwork-search"
        aria-label={tA11y('searchLabel')}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-600 focus-visible:outline-none focus-visible:placeholder-gray-400 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-base sm:text-sm transition-colors"
        placeholder={resolvedPlaceholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-600 hover:text-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-full"
          aria-label={tA11y('clearSearch')}
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
