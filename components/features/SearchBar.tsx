'use client';

import { SearchIcon, CloseIcon } from '@/components/ui/Icons';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function SearchBar({
  value,
  onChange,
  placeholder = '검색어를 입력하세요...',
}: SearchBarProps) {
  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="artwork-search" className="sr-only">
        작품 검색
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-600" />
      </div>
      <input
        type="text"
        id="artwork-search"
        aria-label="작품 검색"
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
          aria-label="검색어 지우기"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
