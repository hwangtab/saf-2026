'use client';

import { useMemo, useState, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import clsx from 'clsx';

import { setMessageMasked } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminMessageRow } from './types';

type Filter = 'all' | 'open' | 'public' | 'masked';

interface MessagesTabProps {
  messages: AdminMessageRow[];
}

export default function MessagesTab({ messages: initial }: MessagesTabProps) {
  const t = useTranslations('admin.petition');
  const [messages, setMessages] = useState<AdminMessageRow[]>(initial);
  const [filter, setFilter] = useState<Filter>('open');
  const [search, setSearch] = useState('');
  const [pending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return messages.filter((m) => {
      if (filter === 'open' && m.is_masked) return false;
      if (filter === 'public' && (!m.message_public || m.is_masked)) return false;
      if (filter === 'masked' && !m.is_masked) return false;
      if (q && !(m.message ?? '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [messages, filter, search]);

  function toggleMask(id: string, next: boolean) {
    setBusyId(id);
    startTransition(async () => {
      const r = await setMessageMasked(id, next);
      setBusyId(null);
      if (!r.ok) {
        alert(r.message ?? t('errorMaskFailed'));
        return;
      }
      setMessages((rows) =>
        rows.map((row) =>
          row.id === id
            ? {
                ...row,
                is_masked: next,
                masked_at: next ? new Date().toISOString() : null,
              }
            : row
        )
      );
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill
          label={t('messagesFilterOpen')}
          active={filter === 'open'}
          onClick={() => setFilter('open')}
        />
        <FilterPill
          label={t('messagesFilterPublic')}
          active={filter === 'public'}
          onClick={() => setFilter('public')}
        />
        <FilterPill
          label={t('messagesFilterMasked')}
          active={filter === 'masked'}
          onClick={() => setFilter('masked')}
        />
        <FilterPill
          label={t('messagesFilterAll')}
          active={filter === 'all'}
          onClick={() => setFilter('all')}
        />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('messagesSearchPlaceholder')}
          className="ml-auto w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-charcoal-muted">
        {t('messagesShownCount', {
          count: filtered.length.toLocaleString('ko-KR'),
          total: messages.length.toLocaleString('ko-KR'),
        })}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          {t('messagesEmpty')}
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((m) => {
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
          ? 'bg-primary text-white'
          : 'bg-white border border-gray-300 text-charcoal-muted hover:text-charcoal-deep'
      )}
    >
      {label}
    </button>
  );
}
