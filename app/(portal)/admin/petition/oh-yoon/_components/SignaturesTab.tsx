'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { getRegionByKey } from '@/lib/petition/regions';
import { PETITION_OH_YOON_SLUG } from '@/lib/petition/constants';
import { deleteSignature, fetchAdminSignatures } from '@/app/actions/petition-admin';
import { useDebounce } from '@/lib/hooks/useDebounce';
import Select from '@/components/ui/Select';

import EditSignatureModal from './EditSignatureModal';
import Pagination from './Pagination';
import type { AdminSignatureRow, SignaturesFilter } from './types';

interface SignaturesTabProps {
  signaturesTotal: number;
}

const DEFAULT_PAGE_SIZE = 50;

export default function SignaturesTab({ signaturesTotal }: SignaturesTabProps) {
  const t = useTranslations('admin.petition');
  const [rows, setRows] = useState<AdminSignatureRow[]>([]);
  const [total, setTotal] = useState(signaturesTotal);
  const [loadState, setLoadState] = useState<'loading' | 'done' | 'error'>('loading');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<SignaturesFilter>('all');
  const debouncedSearch = useDebounce(search, 300);

  const [editing, setEditing] = useState<AdminSignatureRow | null>(null);
  const [deleting, setDeleting] = useState<AdminSignatureRow | null>(null);
  const [pending, startTransition] = useTransition();
  const [statusMsg, setStatusMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);

  const loadData = useCallback(async (p: number, ps: number, q: string, f: SignaturesFilter) => {
    try {
      const result = await fetchAdminSignatures(PETITION_OH_YOON_SLUG, {
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

  function handleSearchChange(val: string) {
    setSearch(val);
    setPage(1);
  }

  function handleFilterChange(val: SignaturesFilter) {
    setFilter(val);
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

  function handleDelete() {
    if (!deleting) return;
    startTransition(async () => {
      const id = deleting.id;
      const result = await deleteSignature(id);
      setDeleting(null);
      if (result.ok) {
        setStatusMsg({ tone: 'ok', text: result.message ?? t('successDeleted') });
        void loadData(page, pageSize, debouncedSearch, filter);
      } else {
        setStatusMsg({ tone: 'err', text: result.message ?? t('errorDeleteFailed') });
      }
    });
  }

  if (loadState === 'loading') {
    return (
      <p className="py-12 text-center text-sm text-charcoal-muted animate-pulse">
        {t('signaturesLoading')}
      </p>
    );
  }

  if (loadState === 'error') {
    return (
      <div className="py-12 text-center space-y-3">
        <p className="text-sm text-danger-a11y">{t('signaturesLoadError')}</p>
        <button
          type="button"
          onClick={handleRetry}
          className="rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-semibold text-charcoal-deep hover:bg-gray-50"
        >
          {t('signaturesRetry')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-charcoal-deep">{t('signaturesHeading')}</h2>
          <p className="text-xs text-charcoal-muted mt-0.5">
            {t('signaturesSubtitle', {
              showing: rows.length.toLocaleString('ko-KR'),
              loaded: total.toLocaleString('ko-KR'),
              total: signaturesTotal.toLocaleString('ko-KR'),
            })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={filter}
            onChange={(e) => handleFilterChange(e.target.value as SignaturesFilter)}
            wrapperClassName="w-auto"
            className="w-auto py-1.5 text-sm"
          >
            <option value="all">{t('signaturesFilterAll')}</option>
            <option value="committee">{t('signaturesFilterCommittee')}</option>
            <option value="duplicates">{t('signaturesFilterDuplicates', { count: '' })}</option>
            <option value="masked">{t('signaturesFilterMasked')}</option>
          </Select>
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder={t('signaturesSearchPlaceholder')}
            className="w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </header>

      {statusMsg && (
        <p
          role="status"
          className={clsx(
            'rounded-lg px-3 py-2 text-sm',
            statusMsg.tone === 'ok'
              ? 'bg-success-surface text-success-strong border border-success/30'
              : 'bg-danger-surface text-danger-a11y border border-danger/30'
          )}
        >
          {statusMsg.text}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('signaturesEmpty')}
        </p>
      ) : (
        <div className="overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase text-charcoal-muted">
              <tr>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColName')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColEmail')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColPhone')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColRegion')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColFlags')}</th>
                <th className="px-3 py-2.5 font-semibold">{t('signaturesColSignedAt')}</th>
                <th className="px-3 py-2.5 font-semibold text-right">
                  {t('signaturesColActions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {rows.map((s) => {
                const region =
                  (getRegionByKey(s.region_top)?.label ?? s.region_top) +
                  (s.region_sub ? ` · ${s.region_sub}` : '');
                return (
                  <tr key={s.id} className={clsx(s.is_masked && 'bg-gray-50/60')}>
                    <td className="px-3 py-2 text-charcoal-deep font-medium">
                      {filter === 'duplicates' ? (
                        <div className="flex items-center gap-1.5">
                          <span>{s.full_name}</span>
                          <span
                            title={t('signaturesDuplicateBadgeTitle')}
                            className="inline-flex items-center rounded bg-charcoal-deep/5 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-deep"
                          >
                            {t('signaturesDuplicateBadge')}
                          </span>
                        </div>
                      ) : (
                        s.full_name
                      )}
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted">{s.email}</td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="hover:underline">
                          {s.phone}
                        </a>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted">{region}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap gap-1">
                        {s.is_committee && (
                          <span className="inline-flex items-center rounded bg-primary-surface px-1.5 py-0.5 text-[10px] font-semibold text-primary-strong">
                            {t('signaturesFlagCommittee')}
                          </span>
                        )}
                        {s.message && (
                          <span
                            className={clsx(
                              'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold',
                              s.message_public
                                ? 'bg-success-surface text-success-strong'
                                : 'bg-gray-100 text-charcoal-muted'
                            )}
                            title={s.message}
                          >
                            {t('signaturesFlagMessage')}
                          </span>
                        )}
                        {s.is_masked && (
                          <span className="inline-flex items-center rounded bg-gray-200 px-1.5 py-0.5 text-[10px] font-semibold text-charcoal-muted">
                            {t('signaturesFlagMasked')}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-charcoal-muted tabular-nums whitespace-nowrap">
                      {new Date(s.created_at).toLocaleString('ko-KR', {
                        year: '2-digit',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => setEditing(s)}
                          disabled={pending}
                          className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-xs font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-50"
                        >
                          {t('signaturesEdit')}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleting(s)}
                          disabled={pending}
                          className="rounded-md border border-danger/30 bg-white px-2.5 py-1 text-xs font-semibold text-danger-a11y hover:bg-danger-surface disabled:opacity-50"
                        >
                          {t('signaturesDelete')}
                        </button>
                      </div>
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

      {editing && (
        <EditSignatureModal
          row={editing}
          onClose={(result) => {
            setEditing(null);
            if (result === 'updated') {
              setStatusMsg({ tone: 'ok', text: t('successUpdated') });
              void loadData(page, pageSize, debouncedSearch, filter);
            }
          }}
        />
      )}

      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-confirm-title"
          className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
        >
          <div
            className="absolute inset-0"
            onClick={() => !pending && setDeleting(null)}
            aria-hidden="true"
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 id="delete-confirm-title" className="text-lg font-bold text-charcoal-deep mb-2">
              {t('signaturesDeleteConfirmTitle')}
            </h3>
            <p className="text-sm text-charcoal mb-1 break-keep">
              {t('signaturesDeleteConfirmBody', { name: deleting.full_name })}
            </p>
            <p className="text-xs text-charcoal-muted mb-5 break-keep">
              {t('signaturesDeleteConfirmIrreversible')}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleting(null)}
                disabled={pending}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-charcoal-deep hover:bg-gray-50 disabled:opacity-50"
              >
                {t('signaturesDeleteCancel')}
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-md bg-danger px-4 py-2 text-sm font-semibold text-white hover:bg-danger-strong disabled:opacity-50"
              >
                {pending ? t('signaturesDeleting') : t('signaturesDeleteConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
