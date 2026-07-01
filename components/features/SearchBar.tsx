'use client';

import { useId, useRef, useState } from 'react';
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
  const inputId = useId();

  // Safari IME fix: 한글 조합 중 controlled input 리렌더가 조합을 끊는 문제를 방지.
  // - composingRef: 이벤트 핸들러 내에서만 접근 (render 중 ref 접근 금지 룰 회피)
  // - localValue + prevValue: 외부 value 변경(초기화) 시 React 권장 "render 중 state 조정" 패턴으로 동기화
  //   (useEffect + setState 금지 룰 회피. 조합 중에는 부모 onChange를 억제하므로 prevValue === value
  //    구간이 유지되어 sync 블록이 실행되지 않음 → 조합 중 localValue 독립 관리)
  const composingRef = useRef(false);
  const [localValue, setLocalValue] = useState(value);
  const [prevValue, setPrevValue] = useState(value);

  if (prevValue !== value) {
    setPrevValue(value);
    setLocalValue(value);
  }

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor={inputId} className="sr-only">
        {tA11y('searchLabel')}
      </label>
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <SearchIcon className="h-5 w-5 text-gray-600" />
      </div>
      <input
        type="text"
        id={inputId}
        aria-label={tA11y('searchLabel')}
        className="block w-full pl-10 pr-10 py-2 border border-gray-300 rounded-full leading-5 bg-white placeholder-gray-600 focus-visible:outline-none focus-visible:placeholder-gray-400 focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary text-base sm:text-sm transition-colors"
        placeholder={resolvedPlaceholder}
        value={localValue}
        onChange={(e) => {
          setLocalValue(e.target.value);
          if (!composingRef.current) onChange(e.target.value);
        }}
        onCompositionStart={() => {
          composingRef.current = true;
        }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          onChange((e.target as HTMLInputElement).value);
        }}
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
