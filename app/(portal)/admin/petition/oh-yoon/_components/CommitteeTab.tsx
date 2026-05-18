'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';

import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';
import { fetchAdminCommittee, fetchCommitteeNames } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';
import { useDebounce } from '@/lib/hooks/useDebounce';

import Pagination from './Pagination';
import type { AdminCommitteeRow } from './types';

interface CommitteeTabProps {
  committeeTotal: number;
}

const DEFAULT_PAGE_SIZE = 50;

export default function CommitteeTab({ committeeTotal }: CommitteeTabProps) {
  const t = useTranslations('admin.petition');
  const [rows, setRows] = useState<AdminCommitteeRow[]>([]);
  const [total, setTotal] = useState(committeeTotal);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [allNames, setAllNames] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);

  const declarationText = useMemo(() => allNames.join(', '), [allNames]);

  const loadData = useCallback(async (p: number, ps: number, q: string) => {
    try {
      const result = await fetchAdminCommittee(PETITION_OH_YOON_SLUG, {
        page: p,
        pageSize: ps,
        search: q || undefined,
      });
      setRows(result.rows);
      setTotal(result.total);
      setLoadState('done');
    } catch {
      setLoadState('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Intentional: loading indicator while re-fetching on dep change
    setLoadState('loading');
    void loadData(page, pageSize, debouncedSearch);
  }, [page, pageSize, debouncedSearch, loadData]);

  // 선언문 복사용 전체 이름 목록 — 1회만 fetch
  useEffect(() => {
    void fetchCommitteeNames(PETITION_OH_YOON_SLUG).then((names) => {
      setAllNames(names);
    });
  }, []);

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handlePageSizeChange(val: number) {
    setPageSize(val);
    setPage(1);
  }

  function handleRetry() {
    setLoadState('loading');
    void loadData(page, pageSize, debouncedSearch);
  }

  function copyDeclaration() {
    void navigator.clipboard.writeText(declarationText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    });
  }

  if (loadState === 'loading') {
    return (
      <p className="py-12 text-center text-sm text-charcoal-muted animate-pulse">
        {t('committeeLoading')}
      </p>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-danger-a11y">{t('committeeLoadError')}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-charcoal-deep hover:bg-gray-50"
        >
          {t('committeeRetry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-charcoal-muted">
          {t('committeeCountLine', { count: committeeTotal.toLocaleString('ko-KR') })}
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('committeeSearchPlaceholder')}
          className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </header>

      <section className="rounded-lg border border-gray-200 bg-canvas p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h2 className="text-sm font-semibold text-charcoal-deep">
            {t('committeeDeclarationHeading')}
          </h2>
          <button
            type="button"
            onClick={copyDeclaration}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-xs font-semibold text-charcoal-deep hover:bg-gray-50"
          >
            {copied ? t('committeeCopied') : t('committeeCopy')}
          </button>
        </div>
        <p className="text-sm text-charcoal whitespace-pre-wrap break-keep max-h-32 overflow-auto">
          {declarationText || t('committeeDeclarationEmpty')}
        </p>
      </section>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('committeeEmpty')}
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColName')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColEmail')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColPhone')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColRegion')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('committeeColSignedAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((c) => {
                const region =
                  (getRegionByKey(c.region_top)?.label ?? c.region_top) +
                  (c.region_sub ? ` · ${c.region_sub}` : '');
                return (
                  <tr key={c.id}>
                    <td className="px-3 py-2 text-charcoal-deep font-medium">{c.full_name}</td>
                    <td className="px-3 py-2 text-charcoal-muted">{c.email}</td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="hover:underline">
                          {c.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted">{region}</td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums">
                      {new Date(c.created_at).toLocaleDateString('ko-KR')}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <p className="text-xs text-charcoal-muted break-keep">{t('committeeFooter')}</p>
    </div>
  );
}
