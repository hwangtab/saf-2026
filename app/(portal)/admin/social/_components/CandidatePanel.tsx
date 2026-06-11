'use client';

import { useMemo, useState } from 'react';

import { AdminCard, AdminEmptyState } from '@/app/(portal)/admin/_components/admin-ui';
import type { PublishCandidate } from '@/app/actions/admin-social';
import { CandidateCard } from './CandidateCard';
import { CandidateFilterBar, type CandidateFilters } from './CandidateFilterBar';

const PAGE_SIZE = 24;

export function CandidatePanel({
  candidates,
  showingArtistNames,
  selectedArtworkId,
  onSelect,
}: {
  candidates: PublishCandidate[];
  showingArtistNames: string[];
  selectedArtworkId: string;
  onSelect: (id: string) => void;
}) {
  const [filters, setFilters] = useState<CandidateFilters>({
    unpostedOnly: true,
    tier: 'all',
    showingOnly: false,
    category: null,
  });
  const [visible, setVisible] = useState(PAGE_SIZE);

  const showingSet = useMemo(() => new Set(showingArtistNames), [showingArtistNames]);
  const categories = useMemo(
    () =>
      Array.from(
        new Set(candidates.map((c) => c.category).filter((v): v is string => Boolean(v)))
      ).sort(),
    [candidates]
  );

  const filtered = useMemo(
    () =>
      candidates.filter((c) => {
        if (filters.unpostedOnly && c.postCount > 0) return false;
        if (filters.tier !== 'all' && c.careerTier !== filters.tier) return false;
        if (filters.showingOnly && !(c.artistName && showingSet.has(c.artistName))) return false;
        if (filters.category && c.category !== filters.category) return false;
        return true;
      }),
    [candidates, filters, showingSet]
  );

  const updateFilters = (next: Partial<CandidateFilters>) => {
    setFilters((prev) => ({ ...prev, ...next }));
    setVisible(PAGE_SIZE);
  };

  return (
    <AdminCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-charcoal-deep">게시 후보</h2>
        <span className="text-xs text-charcoal-soft">{filtered.length}개</span>
      </div>

      <div className="mb-5">
        <CandidateFilterBar
          filters={filters}
          onChange={updateFilters}
          categories={categories}
          hasShowing={showingArtistNames.length > 0}
        />
      </div>

      {filtered.length === 0 ? (
        <AdminEmptyState title="조건에 맞는 후보가 없습니다" description="필터를 조정해 보세요." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5">
            {filtered.slice(0, visible).map((c) => (
              <CandidateCard
                key={c.id}
                candidate={c}
                selected={c.id === selectedArtworkId}
                onSelect={onSelect}
              />
            ))}
          </div>
          {visible < filtered.length && (
            <div className="mt-4 flex justify-center">
              <button
                type="button"
                onClick={() => setVisible((v) => v + PAGE_SIZE)}
                className="rounded-full border border-gallery-hairline px-4 py-1.5 text-sm font-medium text-charcoal-muted hover:bg-charcoal/5"
              >
                더 보기 ({filtered.length - visible})
              </button>
            </div>
          )}
        </>
      )}
    </AdminCard>
  );
}
