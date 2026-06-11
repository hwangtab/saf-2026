'use client';

import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

export type CareerTierFilter = 'all' | '신진' | '중견' | '거장';

const TIERS: { key: CareerTierFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: '거장', label: '거장' },
  { key: '중견', label: '중견' },
  { key: '신진', label: '신진' },
];

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full px-3 py-1 text-xs font-medium transition',
        active
          ? 'bg-primary-strong text-white'
          : 'bg-charcoal/5 text-charcoal-muted hover:bg-charcoal/10'
      )}
    >
      {children}
    </button>
  );
}

export interface CandidateFilters {
  unpostedOnly: boolean;
  tier: CareerTierFilter;
  showingOnly: boolean;
  category: string | null;
}

interface Props {
  filters: CandidateFilters;
  onChange: (next: Partial<CandidateFilters>) => void;
  categories: string[];
  hasShowing: boolean;
}

export function CandidateFilterBar({ filters, onChange, categories, hasShowing }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <Chip
        active={filters.unpostedOnly}
        onClick={() => onChange({ unpostedOnly: !filters.unpostedOnly })}
      >
        미게시만
      </Chip>

      {hasShowing && (
        <Chip
          active={filters.showingOnly}
          onClick={() => onChange({ showingOnly: !filters.showingOnly })}
        >
          진행 중 특별전
        </Chip>
      )}

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-charcoal-soft">작가</span>
        {TIERS.map((t) => (
          <Chip
            key={t.key}
            active={filters.tier === t.key}
            onClick={() => onChange({ tier: t.key })}
          >
            {t.label}
          </Chip>
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-charcoal-soft">매체</span>
          <Chip active={filters.category === null} onClick={() => onChange({ category: null })}>
            전체
          </Chip>
          {categories.map((c) => (
            <Chip
              key={c}
              active={filters.category === c}
              onClick={() => onChange({ category: filters.category === c ? null : c })}
            >
              {c}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
