'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { SortOption } from '@/types';
import { ChevronDownIcon, CheckMarkIcon } from '@/components/ui/Icons';
import { useLocale } from 'next-intl';
import { getUIStrings } from '@/lib/ui-strings';

interface SortControlsProps {
  value: SortOption;
  onChange: (option: SortOption) => void;
}

export default function SortControls({ value, onChange }: SortControlsProps) {
  const ui = getUIStrings(useLocale());
  const sortOptions = useMemo<{ value: SortOption; label: string; icon: string }[]>(
    () => [
      { value: 'artist-asc', label: ui.SORT.ARTIST_ASC, icon: '👤' },
      { value: 'title-asc', label: ui.SORT.TITLE_ASC, icon: '🖼️' },
      { value: 'price-desc', label: ui.SORT.PRICE_DESC, icon: '💰↓' },
      { value: 'price-asc', label: ui.SORT.PRICE_ASC, icon: '💰↑' },
    ],
    [ui.SORT.ARTIST_ASC, ui.SORT.TITLE_ASC, ui.SORT.PRICE_DESC, ui.SORT.PRICE_ASC]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const currentOption = sortOptions.find((opt) => opt.value === value);
  const currentIndex = sortOptions.findIndex((opt) => opt.value === value);

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 키보드 네비게이션
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (!isOpen) {
        if (event.key === 'Enter' || event.key === ' ' || event.key === 'ArrowDown') {
          event.preventDefault();
          setIsOpen(true);
          setFocusedIndex(currentIndex >= 0 ? currentIndex : 0);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          setIsOpen(false);
          setFocusedIndex(-1);
          buttonRef.current?.focus();
          break;
        case 'ArrowDown':
          event.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % sortOptions.length);
          break;
        case 'ArrowUp':
          event.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + sortOptions.length) % sortOptions.length);
          break;
        case 'Enter':
        case ' ':
          event.preventDefault();
          if (focusedIndex >= 0) {
            onChange(sortOptions[focusedIndex].value);
            setIsOpen(false);
            setFocusedIndex(-1);
            buttonRef.current?.focus();
          }
          break;
        case 'Tab':
          setIsOpen(false);
          setFocusedIndex(-1);
          break;
      }
    },
    [isOpen, focusedIndex, currentIndex, onChange, sortOptions]
  );

  return (
    <div className="relative" ref={dropdownRef} onKeyDown={handleKeyDown}>
      <button
        type="button"
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary hover:bg-primary/5 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ui.A11Y.SORT_OPTIONS}
      >
        <span className="text-xs sm:text-sm font-medium text-charcoal whitespace-nowrap">
          {currentOption?.icon} {currentOption?.label}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* 드롭다운 메뉴 */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
          role="listbox"
          aria-label={ui.A11Y.SORT_OPTIONS}
        >
          {sortOptions.map((option, index) => (
            <button
              type="button"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
                setFocusedIndex(-1);
              }}
              className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 transition-colors first:rounded-t-lg last:rounded-b-lg ${
                focusedIndex === index ? 'bg-gray-100 outline-none' : 'hover:bg-gray-50'
              } ${
                value === option.value ? 'bg-primary/10 text-primary font-medium' : 'text-charcoal'
              }`}
              role="option"
              aria-selected={value === option.value}
              tabIndex={-1}
            >
              <span>{option.icon}</span>
              <span>{option.label}</span>
              {value === option.value && <CheckMarkIcon className="w-4 h-4 ml-auto text-primary" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
