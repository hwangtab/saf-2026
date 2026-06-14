'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { searchContacts, type ContactSearchResult } from '@/app/actions/admin-contact-search';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { FIELD_FOCUS } from './field-styles';

export interface SelectedContact {
  email: string;
  name: string | null;
}

interface Props {
  selected: SelectedContact[];
  onChange: (next: SelectedContact[]) => void;
}

export function ContactSearch({ selected, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<ContactSearchResult[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debouncedQuery = useDebounce(query, 300);
  const trimmedQuery = debouncedQuery.trim();
  const reqIdRef = useRef(0);

  // 작품 검색과 동일하게 타이핑하면 실시간으로 후보를 조회한다(버튼 없음).
  // 빈 검색어면 조회하지 않고(effect 내 동기 setState 회피), 결과 노출은 trimmedQuery로 게이팅.
  useEffect(() => {
    if (!trimmedQuery) return;
    const reqId = ++reqIdRef.current;
    startTransition(async () => {
      const r = await searchContacts(trimmedQuery);
      if (reqId !== reqIdRef.current) return; // 최신 요청 응답만 반영 — out-of-order stale 결과 차단(L6)
      setResults(r.results);
      setTruncated(r.truncated);
      setSearched(true);
    });
  }, [trimmedQuery]);

  const add = (c: ContactSearchResult) => {
    if (selected.some((s) => s.email === c.email)) return;
    onChange([...selected, { email: c.email, name: c.name }]);
  };
  const remove = (email: string) => onChange(selected.filter((s) => s.email !== email));
  const clearAll = () => onChange([]);

  const showResults = Boolean(trimmedQuery) && results.length > 0;
  const showNoResults = Boolean(trimmedQuery) && searched && !isPending && results.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        <input
          aria-label="명단에서 찾아 추가"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSearched(false); // 타이핑 시작 시 이전 "결과 없음" 잔류 즉시 제거
          }}
          placeholder="이름 또는 이메일 입력 (실시간 검색)"
          className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
        />
        {isPending && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-charcoal-muted">
            찾는 중…
          </span>
        )}
      </div>

      {showResults && (
        <ul
          aria-live="polite"
          className="max-h-64 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-200"
        >
          {results.map((c) => {
            const already = selected.some((s) => s.email === c.email);
            return (
              <li
                key={c.email}
                className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  <strong className="text-charcoal-deep">{c.name ?? '(이름없음)'}</strong>{' '}
                  <span className="text-charcoal-muted">{c.email}</span>{' '}
                  <span className="text-xs text-charcoal-soft">[{c.sources.join('·')}]</span>
                </span>
                <button
                  type="button"
                  disabled={c.suppressed || already}
                  onClick={() => add(c)}
                  className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
                >
                  {c.suppressed ? '수신거부됨' : already ? '추가됨' : '추가'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {showNoResults && (
        <p
          aria-live="polite"
          className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-charcoal-muted"
        >
          검색 결과가 없습니다.
        </p>
      )}
      {truncated && showResults && (
        <p className="text-xs text-charcoal-soft">
          결과가 많아 일부만 표시합니다. 검색어를 좁혀주세요.
        </p>
      )}

      {selected.length > 0 && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-charcoal">
              선택된 받는 사람 {selected.length.toLocaleString('ko-KR')}명
            </p>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm font-medium text-danger-a11y underline underline-offset-2"
            >
              선택 전체 해제
            </button>
          </div>
          <ul className="max-h-36 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-100">
            {selected.map((s) => (
              <li
                key={s.email}
                className="flex items-center justify-between gap-3 px-3 py-2 text-sm"
              >
                <span className="min-w-0">
                  <span className="block truncate text-charcoal">{s.name ?? '(이름없음)'}</span>
                  <span className="block truncate font-mono text-xs text-charcoal-muted">
                    {s.email}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => remove(s.email)}
                  aria-label={`${s.email} 제거`}
                  className="shrink-0 text-xs font-medium text-charcoal-muted underline underline-offset-2"
                >
                  해제
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
