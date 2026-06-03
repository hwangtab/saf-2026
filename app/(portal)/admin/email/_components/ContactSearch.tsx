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
  const [isPending, startTransition] = useTransition();

  const runSearch = () => {
    startTransition(async () => {
      const r = await searchContacts(query);
      setResults(r.results);
      setTruncated(r.truncated);
    });
  };

  const add = (c: ContactSearchResult) => {
    if (selected.some((s) => s.email === c.email)) return;
    onChange([...selected, { email: c.email, name: c.name }]);
  };
  const remove = (email: string) => onChange(selected.filter((s) => s.email !== email));

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
      {truncated && (
        <p className="text-xs text-charcoal-soft">
          결과가 많아 일부만 표시합니다. 검색어를 좁혀주세요.
        </p>
      )}

      {selected.length > 0 && (
        <div className="rounded-lg bg-canvas-strong p-3">
          <p className="mb-2 text-sm font-medium text-charcoal">담긴 수신자 {selected.length}명</p>
          <ul className="flex flex-wrap gap-2">
            {selected.map((s) => (
              <li
                key={s.email}
                className="flex items-center gap-1 rounded-full bg-white px-2 py-1 text-xs"
              >
                {s.name ?? s.email}
                <button
                  type="button"
                  onClick={() => remove(s.email)}
                  aria-label={`${s.email} 제거`}
                  className="text-danger-a11y"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
