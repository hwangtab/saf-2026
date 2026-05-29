'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import type { PublicChangelogEntry } from '@/lib/changelog-data';
import type { ChangelogFilterType } from '@/lib/changelog';
import { formatDate } from '@/lib/changelog';
import Section from '@/components/ui/Section';

const PER_PAGE = 30;

const TYPE_BADGE: Record<string, string> = {
  feat: 'bg-primary/10 text-primary-strong',
  fix: 'bg-sun-soft text-charcoal',
  perf: 'bg-gray-100 text-charcoal-muted',
  refactor: 'bg-gray-100 text-charcoal-muted',
};

interface ChangelogFeedProps {
  entries: PublicChangelogEntry[];
  locale: string;
}

export default function ChangelogFeed({ entries, locale: _locale }: ChangelogFeedProps) {
  const t = useTranslations('changelog');
  const [filter, setFilter] = useState<ChangelogFilterType>('all');
  const [visibleCount, setVisibleCount] = useState(PER_PAGE);

  const FILTERS: { value: ChangelogFilterType; label: string }[] = [
    { value: 'all', label: t('filterAll') },
    { value: 'feat', label: t('filterFeat') },
    { value: 'fix', label: t('filterFix') },
    { value: 'perf', label: t('filterPerf') },
  ];

  const filtered = filter === 'all' ? entries : entries.filter((e) => e.type === filter);

  const visible = filtered.slice(0, visibleCount);
  const hasMore = visibleCount < filtered.length;

  // PublicChangelogEntry를 groupByDate에 맞는 형태로 변환하지 않고 직접 그룹핑
  const groups: Record<string, PublicChangelogEntry[]> = {};
  for (const entry of visible) {
    if (!groups[entry.date]) groups[entry.date] = [];
    groups[entry.date].push(entry);
  }
  const dates = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  function handleFilterChange(value: ChangelogFilterType) {
    setFilter(value);
    setVisibleCount(PER_PAGE);
  }

  if (entries.length === 0) {
    return (
      <Section variant="white" className="pb-24 md:pb-32">
        <div className="container-max">
          <p className="text-charcoal-muted text-sm text-center py-16">{t('noEntries')}</p>
        </div>
      </Section>
    );
  }

  return (
    <Section variant="white" className="pb-24 md:pb-32">
      <div className="container-max">
        <div className="mx-auto max-w-3xl">
          {/* Filter pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => handleFilterChange(f.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ${
                  filter === f.value
                    ? 'bg-primary-strong text-white shadow-sm'
                    : 'bg-gray-100 text-charcoal-muted hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Grouped entries */}
          {filtered.length === 0 ? (
            <p className="text-charcoal-muted text-sm py-8 text-center">{t('empty')}</p>
          ) : (
            <div className="space-y-8">
              {dates.map((date) => (
                <div key={date}>
                  <h2 className="text-sm font-semibold text-charcoal-muted mb-3">
                    {formatDate(date)}
                  </h2>
                  <div className="rounded-2xl border border-gray-200 bg-white shadow-sm divide-y divide-gray-100">
                    {groups[date].map((entry, idx) => (
                      <div key={`${date}-${idx}`} className="px-5 py-4">
                        <div className="flex flex-wrap items-start gap-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${TYPE_BADGE[entry.type] ?? 'bg-gray-100 text-charcoal-muted'}`}
                          >
                            {entry.typeLabel}
                          </span>
                          {entry.scopeLabel && (
                            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-charcoal-muted">
                              {entry.scopeLabel}
                            </span>
                          )}
                          <span className="flex-1 text-sm text-charcoal leading-relaxed break-keep">
                            {entry.title}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + PER_PAGE)}
                    className="rounded-full px-6 py-2.5 text-sm font-semibold border border-charcoal/20 text-charcoal bg-white hover:bg-canvas hover:-translate-y-0.5 hover:shadow-md transition-[transform,box-shadow,background-color] duration-300"
                  >
                    {t('loadMore')}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
