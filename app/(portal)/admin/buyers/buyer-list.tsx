'use client';

import { useState, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AdminCard, AdminCardHeader, AdminEmptyState } from '@/app/admin/_components/admin-ui';
import { matchesAnySearch } from '@/lib/search-utils';
import { useToast } from '@/lib/hooks/useToast';
import { updateBuyerPhone } from '@/app/actions/admin-buyers';
import type { BuyerRecord } from '@/app/actions/admin-buyers';

type SortKey = 'revenue' | 'purchaseCount' | 'artworkCount' | 'buyerName' | 'lastPurchaseDate';
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

export function BuyerList({ buyers }: { buyers: BuyerRecord[] }) {
  const router = useRouter();
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('purchaseCount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editPhone, setEditPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return buyers;
    return buyers.filter((b) => matchesAnySearch(search, [b.buyerName, b.buyerPhone]));
  }, [buyers, search]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'revenue':
          cmp = a.revenue - b.revenue;
          break;
        case 'purchaseCount':
          cmp = a.purchaseCount - b.purchaseCount;
          break;
        case 'artworkCount':
          cmp = a.artworkCount - b.artworkCount;
          break;
        case 'buyerName':
          cmp = a.buyerName.localeCompare(b.buyerName, 'ko');
          break;
        case 'lastPurchaseDate':
          cmp = a.lastPurchaseDate.localeCompare(b.lastPurchaseDate);
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
      setSortDir(key === 'buyerName' ? 'asc' : 'desc');
    }
  }

  function sortIndicator(key: SortKey) {
    if (sortKey !== key) {
      return <span className="ml-1 text-slate-300">↕</span>;
    }
    return <span className="ml-1">{sortDir === 'asc' ? '▲' : '▼'}</span>;
  }

  function startEdit(buyer: BuyerRecord) {
    setEditingName(buyer.buyerName);
    setEditPhone(buyer.buyerPhone || '');
  }

  async function savePhone(buyerName: string, saleIds: string[]) {
    if (saving) return;
    setSaving(true);
    try {
      await updateBuyerPhone(saleIds, editPhone);
      toast.success('연락처가 저장되었습니다.');
      setEditingName((prev) => (prev === buyerName ? null : prev));
      router.refresh();
    } catch {
      toast.error('연락처 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent, buyerName: string, saleIds: string[]) {
    if (e.key === 'Enter') {
      e.preventDefault();
      savePhone(buyerName, saleIds);
    }
    if (e.key === 'Escape') setEditingName(null);
  }

  const exportCsv = useCallback(() => {
    const lines: string[] = [];
    lines.push('구매자,연락처,구매 수량,작품 수,채널,최근 구매,매출');
    for (const b of sorted) {
      lines.push(
        [
          `"${b.buyerName}"`,
          b.buyerPhone || '',
          b.purchaseCount,
          b.artworkCount,
          formatChannel(b.channels),
          formatDate(b.lastPurchaseDate),
          b.revenue,
        ].join(',')
      );
    }
    const bom = '\uFEFF';
    const blob = new Blob([bom + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `saf2026-buyers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [sorted]);

  return (
    <>
      <div className="flex items-center gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="이름 또는 전화번호 검색..."
          className="w-full max-w-sm rounded-lg border border-slate-300 px-4 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
        <span className="shrink-0 text-sm text-slate-500">
          {filtered.length}명{search.trim() ? ` / ${buyers.length}명` : ''}
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
          <h2 className="text-base font-semibold text-slate-900">구매자 목록</h2>
          <span className="text-xs text-slate-500">연락처 클릭 시 편집 가능</span>
        </AdminCardHeader>

        {sorted.length === 0 ? (
          <AdminEmptyState title="구매자 없음" description="검색 조건에 맞는 구매자가 없습니다." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 text-left">#</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-left hover:text-slate-800"
                    onClick={() => toggleSort('buyerName')}
                  >
                    구매자{sortIndicator('buyerName')}
                  </th>
                  <th className="px-4 py-3 text-left">연락처</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('purchaseCount')}
                  >
                    구매 수량{sortIndicator('purchaseCount')}
                  </th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('artworkCount')}
                  >
                    작품 수{sortIndicator('artworkCount')}
                  </th>
                  <th className="px-4 py-3 text-right">채널</th>
                  <th
                    className="cursor-pointer select-none px-4 py-3 text-right hover:text-slate-800"
                    onClick={() => toggleSort('lastPurchaseDate')}
                  >
                    최근 구매{sortIndicator('lastPurchaseDate')}
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
                {sorted.map((buyer, index) => (
                  <tr key={buyer.saleIds[0]} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-800">{index + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{buyer.buyerName}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {editingName === buyer.buyerName ? (
                        <input
                          type="tel"
                          value={editPhone}
                          onChange={(e) => setEditPhone(e.target.value)}
                          onBlur={() => savePhone(buyer.buyerName, buyer.saleIds)}
                          onKeyDown={(e) => handleKeyDown(e, buyer.buyerName, buyer.saleIds)}
                          disabled={saving}
                          autoFocus
                          className="w-36 rounded border border-indigo-300 px-2 py-1 text-sm focus:outline-none"
                          placeholder="010-0000-0000"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => startEdit(buyer)}
                          className="rounded px-1 py-0.5 text-left hover:bg-slate-100"
                          title="클릭하여 편집"
                        >
                          {buyer.buyerPhone || '—'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(buyer.purchaseCount)} 점
                    </td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {numberFormatter.format(buyer.artworkCount)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatChannel(buyer.channels)}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatDate(buyer.lastPurchaseDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900">
                      {krwFormatter.format(buyer.revenue)}
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
