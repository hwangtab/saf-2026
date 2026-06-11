'use client';

import { useEffect, useState, useTransition } from 'react';

import {
  searchBroadcastArtworks,
  type BroadcastArtworkSearchResult,
} from '@/app/actions/admin-broadcast';
import { useDebounce } from '@/lib/hooks/useDebounce';
import { FIELD_FOCUS } from './field-styles';

interface Props {
  value: string;
  onChange: (artworkId: string) => void;
}

function formatArtworkStatus(status: string | null) {
  if (status === 'available') return '판매중';
  if (status === 'reserved') return '예약';
  if (status === 'sold') return '판매완료';
  return null;
}

export function ArtworkSearchSelect({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BroadcastArtworkSearchResult[]>([]);
  const [selected, setSelected] = useState<BroadcastArtworkSearchResult | null>(null);
  const [searched, setSearched] = useState(false);
  const [isPending, startTransition] = useTransition();
  const debouncedQuery = useDebounce(query, 300);

  // 부모가 value를 외부에서 비우면(예: 받는 사람 종류 전환) 내부 선택도 초기화.
  // effect 안 setState(cascading render) 대신 React 권장 "렌더 중 상태 조정" 패턴 사용.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    // 외부에서 value가 비워지거나 다른 작품 id로 채워질 때(예: 후보 카드 클릭) 내부 선택 동기화.
    if (value !== selected?.id) setSelected(null);
  }

  const selectedArtworkId = selected?.id ?? value;
  const trimmedQuery = debouncedQuery.trim();

  // 검색어가 비면 fetch하지 않는다(effect 내 동기 setState 회피). 빈 검색어일 때의 결과 노출은
  // 렌더에서 trimmedQuery 게이팅으로 막으므로 stale results 상태는 화면에 드러나지 않는다.
  useEffect(() => {
    if (!trimmedQuery) return;
    startTransition(async () => {
      const response = await searchBroadcastArtworks(trimmedQuery);
      setResults(response.results);
      setSearched(true);
    });
  }, [trimmedQuery]);

  const selectArtwork = (artwork: BroadcastArtworkSearchResult) => {
    setSelected(artwork);
    setQuery('');
    setResults([]);
    setSearched(false);
    onChange(artwork.id);
  };

  const clearSelection = () => {
    setSelected(null);
    onChange('');
  };

  return (
    <div className="space-y-2">
      {selectedArtworkId ? (
        <p className="text-sm font-medium text-charcoal">선택된 작품</p>
      ) : (
        <label
          htmlFor="broadcast-artwork-search"
          className="block text-sm font-medium text-charcoal"
        >
          작품 검색
        </label>
      )}
      {selectedArtworkId ? (
        <div className="rounded-lg border border-primary/30 bg-white p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-charcoal-deep">
                {selected?.title ?? '선택된 작품'}
              </p>
              {selected && (
                <p className="truncate text-xs text-charcoal-muted">
                  {selected.artistName || selected.artistNameEn || '작가 미상'}
                </p>
              )}
              <p className="mt-1 truncate font-mono text-xs text-charcoal-soft">
                {selectedArtworkId}
              </p>
            </div>
            <button
              type="button"
              onClick={clearSelection}
              className="shrink-0 text-xs font-medium text-charcoal-muted underline underline-offset-2"
            >
              다시 선택
            </button>
          </div>
        </div>
      ) : (
        <>
          <input
            id="broadcast-artwork-search"
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSearched(false); // 타이핑 시 이전 "결과 없음" 잔류 즉시 제거
            }}
            placeholder="작품명 또는 작가명 입력"
            className={`block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm ${FIELD_FOCUS}`}
          />
          {isPending && <p className="text-xs text-charcoal-muted">작품 검색 중...</p>}
          {trimmedQuery && results.length > 0 && (
            <ul
              aria-live="polite"
              className="max-h-64 divide-y divide-gray-100 overflow-auto rounded-lg border border-gray-200 bg-white"
            >
              {results.map((artwork) => (
                <li key={artwork.id}>
                  <button
                    type="button"
                    onClick={() => selectArtwork(artwork)}
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-canvas-soft"
                  >
                    <span className="block truncate font-medium text-charcoal-deep">
                      {artwork.title}
                    </span>
                    <span className="block truncate text-xs text-charcoal-muted">
                      {artwork.artistName || artwork.artistNameEn || '작가 미상'}
                      {formatArtworkStatus(artwork.status)
                        ? ` · ${formatArtworkStatus(artwork.status)}`
                        : ''}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {trimmedQuery && searched && !isPending && results.length === 0 && (
            <p
              aria-live="polite"
              className="rounded-lg border border-gray-200 bg-white px-3 py-4 text-sm text-charcoal-muted"
            >
              검색 결과가 없습니다.
            </p>
          )}
        </>
      )}
    </div>
  );
}
