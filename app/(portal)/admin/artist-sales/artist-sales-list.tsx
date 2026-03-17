'use client';

import { useState, useMemo, useCallback } from 'react';
import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { matchesAnySearch } from '@/lib/search-utils';
import type { ArtistSalesRecord } from '@/app/actions/admin-artist-sales';

type SortKey =
  | 'artistName'
  | 'soldCount'
  | 'artworkCount'
  | 'avgPrice'
  | 'lastSaleDate'
  | 'revenue';
type SortDir = 'asc' | 'desc';

const krwFormatter = new Intl.NumberFormat('ko-KR', {
  style: 'currency',
  currency: 'KRW',
  maximumFractionDigits: 0,
});

const numberFormatter = new Intl.NumberFormat('ko-KR');

function formatChannel(channels: ('offline' | 'online')[]) {
  if (channels.includes('offline') && channels.includes('online')) return '오프+온라인';
  if (channels.includes('online')) return '온라인';
  return '오프라인';
}

function formatDate(iso: string) {
  if (!iso) return '-';
  return iso.slice(0, 10);
}

export function ArtistSalesList({ artists }: { artists: ArtistSalesRecord[] }) {
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('soldCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const filtered = useMemo(() => {
    if (!search.trim()) return artists;
    return artists.filter((a) => matchesAnySearch(search, [a.artistName]));
  }, [artists, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'artistName':
          cmp = a.artistName.localeCompare(b.artistName, 'ko');
          break;
        case 'soldCount':
          cmp = a.soldCount - b.soldCount;
          break;
        case 'artworkCount':
          cmp = a.artworkCount - b.artworkCount;
          break;
        case 'avgPrice':
          cmp = a.avgPrice - b.avgPrice;
          break;
        case 'lastSaleDate':
          cmp = a.lastSaleDate.localeCompare(b.lastSaleDate);
          break;
        case 'revenue':
          cmp = a.revenue - b.revenue;
          break;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'artistName' ? 'asc' : 'desc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) {
      return <span className="ml-1 text-slate-300">↕</span>;
    }
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  const exportCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push('작가명,판매 수량,판매 작품 수,등록 작품 수,평균 판매가,채널,최근 판매,매출');
    for (const a of sorted) {
      lines.push(
        [
          `"${a.artistName}"`,
          a.soldCount,
          a.artworkCount,
          a.totalArtworkCount,
          a.avgPrice,
          formatChannel(a.channels),
          formatDate(a.lastSaleDate),
          a.revenue,
        ].join(',')
      );
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'saf2026-artist-sales.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="작가명 검색..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <span className="shrink-0 text-sm text-slate-500">
          {filtered.length}명{search.trim() ? ` / ${artists.length}명` : ''}
        </span>
        <button
          onClick={exportCsv}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          CSV
        </button>
      </div>

      <AdminCard className="overflow-hidden">
        <AdminCardHeader className="rounded-t-2xl">
          <h2 className="text-base font-semibold text-slate-900">작가별 판매 목록</h2>
        </AdminCardHeader>

        {sorted.length === 0 ? (
          <AdminEmptyState title="판매 기록 없음" description="검색 조건에 맞는 작가가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-slate-800"
                    onClick={() => toggleSort('artistName')}
                  >
                    작가명{sortIndicator('artistName')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('soldCount')}
                  >
                    판매 수량{sortIndicator('soldCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('artworkCount')}
                  >
                    판매 작품{sortIndicator('artworkCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('avgPrice')}
                  >
                    평균 판매가{sortIndicator('avgPrice')}
                  </th>
                  <th className="px-4 py-3 text-right">채널</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('lastSaleDate')}
                  >
                    최근 판매{sortIndicator('lastSaleDate')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('revenue')}
                  >
                    매출{sortIndicator('revenue')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white text-sm">
                {sorted.map((artist, index) => (
                  <tr key={artist.artistId || artist.artistName} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{artist.artistName}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(artist.soldCount)} 점
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {artist.artworkCount}/{artist.totalArtworkCount}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {krwFormatter.format(artist.avgPrice)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatChannel(artist.channels)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatDate(artist.lastSaleDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {krwFormatter.format(artist.revenue)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </>
  );
}
