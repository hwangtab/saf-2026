'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { SearchResponse } from '@/app/api/search/route';

interface UseGlobalSearchReturn {
  isOpen: boolean;
  query: string;
  results: SearchResponse | null;
  isLoading: boolean;
  error: string | null;
  open: () => void;
  close: () => void;
  setQuery: (query: string) => void;
}

export function useGlobalSearch(): UseGlobalSearchReturn {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQueryState] = useState('');
  const [results, setResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchSearch = useCallback((searchQuery: string) => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsLoading(true);
    setError(null);

    fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error('Search failed');
        return res.json() as Promise<SearchResponse>;
      })
      .then((data) => {
        setResults(data);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setError('SEARCH_ERROR');
        setIsLoading(false);
      });
  }, []);

  const clearDebounce = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = null;
    }
  }, []);

  const setQuery = useCallback(
    (newQuery: string) => {
      setQueryState(newQuery);
      clearDebounce();

      if (!newQuery.trim()) {
        setResults(null);
        setIsLoading(false);
        abortControllerRef.current?.abort();
        return;
      }

      setIsLoading(true);
      debounceTimerRef.current = setTimeout(() => {
        fetchSearch(newQuery);
      }, 300);
    },
    [fetchSearch, clearDebounce]
  );

  const open = useCallback(() => {
    setIsOpen(true);
    setQueryState('');
    setResults(null);
    setError(null);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setQueryState('');
    setResults(null);
    setError(null);
    abortControllerRef.current?.abort();
    clearDebounce();
  }, [clearDebounce]);

  // Cmd/Ctrl+K 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        // toggle: 상태를 콜백으로 읽어 최신 값 보장
        setIsOpen((prev) => {
          if (prev) {
            // close 로직
            setQueryState('');
            setResults(null);
            setError(null);
            abortControllerRef.current?.abort();
            if (debounceTimerRef.current) {
              clearTimeout(debounceTimerRef.current);
              debounceTimerRef.current = null;
            }
            return false;
          }
          // open 로직
          setQueryState('');
          setResults(null);
          setError(null);
          return true;
        });
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // 컴포넌트 언마운트 시 클린업
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return { isOpen, query, results, isLoading, error, open, close, setQuery };
}
