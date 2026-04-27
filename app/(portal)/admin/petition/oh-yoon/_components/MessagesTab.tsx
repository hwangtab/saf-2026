'use client';

import { useMemo, useState, useTransition } from 'react';
import clsx from 'clsx';

import { setMessageMasked } from '@/app/actions/petition-admin';
import { getRegionByKey } from '@/lib/petition/regions';

import type { AdminMessageRow } from './types';

type Filter = 'all' | 'open' | 'public' | 'masked';

interface MessagesTabProps {
  messages: AdminMessageRow[];
}

export default function MessagesTab({ messages: initial }: MessagesTabProps) {
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
        alert(r.message ?? '실패');
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
          label="검토 대기"
          active={filter === 'open'}
          onClick={() => setFilter('open')}
        />
        <FilterPill
          label="공개 동의분만"
          active={filter === 'public'}
          onClick={() => setFilter('public')}
        />
        <FilterPill
          label="마스킹된 것만"
          active={filter === 'masked'}
          onClick={() => setFilter('masked')}
        />
        <FilterPill label="전체" active={filter === 'all'} onClick={() => setFilter('all')} />

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="메시지 본문 검색"
          className="ml-auto w-full sm:w-64 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <p className="text-xs text-charcoal-muted">
        {filtered.length.toLocaleString('ko-KR')}건 표시 (전체{' '}
        {messages.length.toLocaleString('ko-KR')}건)
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-300 bg-gray-50 px-6 py-12 text-center text-sm text-charcoal-muted">
          조건에 맞는 메시지가 없습니다.
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
                        공개동의
                      </span>
                    )}
                    {m.is_masked && (
                      <span className="ml-2 inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-[11px] font-semibold text-gray-700">
                        마스킹됨
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
                      className="rounded-md border border-primary/40 bg-white px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/10 disabled:opacity-60"
                    >
                      {isBusy ? '처리 중…' : '복원'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleMask(m.id, true)}
                      disabled={isBusy}
                      className="rounded-md border border-danger/40 bg-white px-3 py-1.5 text-xs font-semibold text-danger-a11y hover:bg-danger/10 disabled:opacity-60"
                    >
                      {isBusy ? '처리 중…' : '마스킹'}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="text-xs text-charcoal-muted">
        마스킹 처리는 트리거가 자동으로 감사 로그에 기록합니다 (mask_message / unmask_message).
      </p>
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
