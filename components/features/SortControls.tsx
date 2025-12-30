'use client';

import { useState, useRef, useEffect } from 'react';

export type SortOption = 'artist-asc' | 'title-asc' | 'price-desc' | 'price-asc';

interface SortControlsProps {
    value: SortOption;
    onChange: (option: SortOption) => void;
}

const sortOptions: { value: SortOption; label: string; icon: string }[] = [
    { value: 'artist-asc', label: '작가명순', icon: '👤' },
    { value: 'title-asc', label: '작품명순', icon: '🖼️' },
    { value: 'price-desc', label: '가격 높은순', icon: '💰↓' },
    { value: 'price-asc', label: '가격 낮은순', icon: '💰↑' },
];

export default function SortControls({ value, onChange }: SortControlsProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentOption = sortOptions.find(opt => opt.value === value);

    // 외부 클릭 시 드롭다운 닫기
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="flex items-center justify-between mb-4 px-4">
            <p className="text-sm text-charcoal-muted">
                정렬 기준
            </p>

            {/* 드롭다운 (모바일 친화적) */}
            <div className="relative" ref={dropdownRef}>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm hover:border-primary hover:bg-primary/5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
                    aria-haspopup="listbox"
                    aria-expanded={isOpen}
                >
                    <span className="text-sm font-medium text-charcoal">
                        {currentOption?.icon} {currentOption?.label}
                    </span>
                    <svg
                        className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* 드롭다운 메뉴 */}
                {isOpen && (
                    <div
                        className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50"
                        role="listbox"
                    >
                        {sortOptions.map((option) => (
                            <button
                                key={option.value}
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm flex items-center gap-2 hover:bg-gray-50 transition-colors first:rounded-t-lg last:rounded-b-lg ${value === option.value
                                        ? 'bg-primary/10 text-primary font-medium'
                                        : 'text-charcoal'
                                    }`}
                                role="option"
                                aria-selected={value === option.value}
                            >
                                <span>{option.icon}</span>
                                <span>{option.label}</span>
                                {value === option.value && (
                                    <svg className="w-4 h-4 ml-auto text-primary" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
