'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';
import { fetchAdminMessages, setMessageMasked } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';
import { useDebounce } from '@/lib/hooks/useDebounce';

import Pagination from './Pagination';
import type { AdminMessageRow, MessagesFilter } from './types';

const DEFAULT_PAGE_SIZE = 50;

export default function MessagesTab() {
  const t = useTranslations('admin.petition');
  const [rows, setRows] = useState<AdminMessageRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [filter, setFilter] = useState<MessagesFilter>('open');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadData = useCallback(async (p: number, ps: number, q: string, f: MessagesFilter) => {
    try {
      const result = await fetchAdminMessages(PETITION_OH_YOON_SLUG, {
        page: p,
        pageSize: ps,
        search: q || undefined,
        filter: f,
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
    void loadData(page, pageSize, debouncedSearch, filter);
  }, [page, pageSize, debouncedSearch, filter, loadData]);

  function handleFilterChange(val: MessagesFilter) {
    setFilter(val);
    setPage(1);
  }

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
    void loadData(page, pageSize, debouncedSearch, filter);
  }

  function toggleMask(id: string, next: boolean) {
    setBusyId(id);
    startTransition(async () => {
      const r = await setMessageMasked(id, next);
      setBusyId(null);
      if (!r.ok) {
        alert(r.message ?? t('errorMaskFailed'));
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === id
            ? { ...row, is_masked: next, masked_at: next ? new Date().toISOString() : null }
            : row
        )
      );
    });
  }

  if (loadState === 'loading') {
    return (
      <p className="py-12 text-center text-sm text-charcoal-muted animate-pulse">
        {t('messagesLoading')}
      </p>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-danger-a11y">{t('messagesLoadError')}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-charcoal-deep hover:bg-gray-50"
        >
          {t('messagesRetry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label={t('messagesFilterOpen')}
          active={filter === 'open'}
          onClick={() => handleFilterChange('open')}
        />
        <FilterPill
          label={t('messagesFilterPublic')}
          active={filter === 'public'}
          onClick={() => handleFilterChange('public')}
        />
        <FilterPill
          label={t('messagesFilterMasked')}
          active={filter === 'masked'}
          onClick={() => handleFilterChange('masked')}
        />
        <FilterPill
          label={t('messagesFilterAll')}
          active={filter === 'all'}
          onClick={() => handleFilterChange('all')}
        />

        <input
          type="search"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t('messagesSearchPlaceholder')}
          className="ml-auto w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-charcoal-muted">
        {t('messagesShownCount', {
          count: rows.length.toLocaleString('ko-KR'),
          total: total.toLocaleString('ko-KR'),
        })}
      </p>

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('messagesEmpty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {rows.map((m) => {
            const regionLabel = getRegionByKey(m.region_top)?.label ?? m.region_top;
            const subLabel = m.region_sub ? ` · ${m.region_sub}` : '';
            const dateLabel = new Date(m.created_at).toLocaleString('ko-KR');
            const isBusy = pending && busyId === m.id;
            return (
              <li
                key={m.id}
                className={clsx(
                  'rounded-lg border bg-white px-4 py-3',
                  m.is_masked ? 'border-gray-200 opacity-60' : 'border-gray-200'
                )}
              >
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2 text-xs text-charcoal-muted">
                  <span>
                    {regionLabel}
                    {subLabel} · {dateLabel}
                    {m.message_public && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-primary-surface px-2 py-0.5 text-[11px] font-semibold text-primary-strong">
                        {t('messagesPublicBadge')}
                      </span>
                    )}
                    {m.is_masked && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        {t('messagesMaskedBadge')}
                      </span>
                    )}
                  </span>
                  <span className="text-charcoal-muted">{m.full_name}</span>
                </div>
                <p className="text-sm text-charcoal whitespace-pre-wrap break-keep">
                  {m.message ?? ''}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {m.is_masked ? (
                    <button
                      type="button"
                      onClick={() => toggleMask(m.id, false)}
                      disabled={isBusy}
                      className="rounded-md border border-primary/40 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary-surface disabled:opacity-60"
                    >
                      {isBusy ? t('messagesActionPending') : t('messagesActionRestore')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleMask(m.id, true)}
                      disabled={isBusy}
                      className="rounded-md border border-danger/40 bg-white px-3 py-1.5 text-xs font-semibold text-danger-a11y hover:bg-danger/10 disabled:opacity-60"
                    >
                      {isBusy ? t('messagesActionPending') : t('messagesActionMask')}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <Pagination
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={setPage}
        onPageSizeChange={handlePageSizeChange}
      />

      <p className="text-xs text-charcoal-muted">{t('messagesAuditNote')}</p>
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'rounded-full px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'bg-primary-strong text-white'
          : 'bg-white border border-gray-300 text-charcoal-muted hover:text-charcoal-deep'
      )}
    >
      {label}
    </button>
  );
}
