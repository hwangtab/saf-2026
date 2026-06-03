'use client';

import { useState, useTransition } from 'react';
import { searchContacts, type ContactSearchResult } from '@/app/actions/admin-contact-search';

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

  const runSearch = () => {
    startTransition(async () => {
      const r = await searchContacts(query);
      setResults(r.results);
      setTruncated(r.truncated);
      setSearched(true);
    });
  };

  const add = (c: ContactSearchResult) => {
    if (selected.some((s) => s.email === c.email)) return;
    onChange([...selected, { email: c.email, name: c.name }]);
  };
  const remove = (email: string) => onChange(selected.filter((s) => s.email !== email));
  const clearAll = () => onChange([]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <input
          aria-label="연락처 검색"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="이름 또는 이메일"
          className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={isPending}
          className="shrink-0 rounded-lg bg-primary-strong px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {isPending ? '검색 중…' : '검색'}
        </button>
      </div>

      {results.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {results.map((c) => (
            <li key={c.email} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
              <span className="truncate">
                <strong className="text-charcoal-deep">{c.name ?? '(이름없음)'}</strong>{' '}
                <span className="text-charcoal-muted">{c.email}</span>{' '}
                <span className="text-xs text-charcoal-soft">[{c.sources.join('·')}]</span>
              </span>
              <button
                type="button"
                disabled={c.suppressed || selected.some((s) => s.email === c.email)}
                onClick={() => add(c)}
                className="shrink-0 rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
              >
                {c.suppressed
                  ? '수신거부됨'
                  : selected.some((s) => s.email === c.email)
                    ? '담김'
                    : '담기'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searched && !isPending && results.length === 0 && (
        <p className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-charcoal-muted">
          검색 결과가 없습니다.
        </p>
      )}
      {truncated && (
        <p className="text-xs text-charcoal-soft">
          결과가 많아 일부만 표시합니다. 검색어를 좁혀주세요.
        </p>
      )}

      {selected.length > 0 && (
        <div className="space-y-2 rounded-lg border border-gray-200 bg-white p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-charcoal">
              선택된 수신자 {selected.length.toLocaleString('ko-KR')}명
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
