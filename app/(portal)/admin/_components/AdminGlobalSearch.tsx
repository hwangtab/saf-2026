'use client';

import { useState, useEffect, useCallback, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Modal from '@/components/ui/Modal';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { searchAdmin, type AdminSearchResult } from '@/app/actions/admin-search';
import { Search } from 'lucide-react';

export function AdminGlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AdminSearchResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const reqIdRef = useRef(0);
  const debounced = useDebounce(query, 250);
  const term = debounced.trim();

  // ⌘K / Ctrl+K 전역 단축키로 열기.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(true);
      }
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // 열릴 때 입력 포커스(DOM 부수효과만 — effect 내 setState 없음).
  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(id);
  }, [open]);

  // 2글자 이상일 때만 조회. 빈/짧은 검색어는 early-return(effect 내 동기 setState 회피),
  // 결과 노출은 term 길이로 게이팅. setState는 전부 startTransition async 콜백 안에서만.
  useEffect(() => {
    if (term.length < 2) return;
    const reqId = ++reqIdRef.current;
    startTransition(async () => {
      const res = await searchAdmin(term);
      if (reqId !== reqIdRef.current) return; // 최신 요청 응답만 반영
      setResults(res);
      setSearched(true);
      setActiveIndex(0);
    });
  }, [term]);

  const close = useCallback(() => {
    setOpen(false);
    setQuery('');
    setResults([]);
    setSearched(false);
    setActiveIndex(0);
  }, []);

  const go = useCallback(
    (result: AdminSearchResult) => {
      close();
      router.push(result.href);
    },
    [router, close]
  );

  const showResults = term.length >= 2 && results.length > 0;
  const showEmpty = term.length >= 2 && searched && !isPending && results.length === 0;

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) go(target);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-gray-200 bg-white px-2.5 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
        aria-label="관리자 전역 검색"
        title="검색 (⌘K)"
      >
        <Search className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline">검색</span>
        <kbd className="hidden rounded bg-gray-100 px-1.5 py-0.5 font-sans text-[10px] text-gray-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      <Modal isOpen={open} onClose={close} title="전역 검색" className="max-w-xl">
        <div className="space-y-3">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            placeholder="주문번호 · 구매자 · 작품명 · 작가명"
            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-a11y focus:outline-none focus:ring-1 focus:ring-primary-a11y"
          />

          <div className="max-h-[50vh] overflow-y-auto">
            {isPending && <p className="px-1 py-3 text-sm text-gray-400">검색 중…</p>}
            {showEmpty && <p className="px-1 py-3 text-sm text-gray-400">결과가 없습니다.</p>}
            {term.length < 2 && (
              <p className="px-1 py-3 text-sm text-gray-400">두 글자 이상 입력하세요.</p>
            )}
            <ul className="divide-y divide-gray-100">
              {showResults &&
                results.map((r, i) => (
                  <li key={`${r.type}:${r.href}`}>
                    <button
                      type="button"
                      onClick={() => go(r)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 rounded-md px-2 py-2 text-left ${
                        i === activeIndex ? 'bg-primary-surface' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span className="inline-flex shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                        {r.typeLabel}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-gray-800">
                          {r.label}
                        </span>
                        {r.sublabel && (
                          <span className="block truncate text-xs text-gray-500">{r.sublabel}</span>
                        )}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      </Modal>
    </>
  );
}
