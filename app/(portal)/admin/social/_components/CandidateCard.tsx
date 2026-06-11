'use client';

import SafeImage from '@/components/common/SafeImage';
import { cn } from '@/lib/utils/cn';
import { resolvePublicImageUrl } from '@/lib/social/image-url';
import type { PublishCandidate } from '@/app/actions/admin-social';
import { PostHistoryBadge } from './PostHistoryBadge';

export function CandidateCard({
  candidate,
  selected,
  onSelect,
}: {
  candidate: PublishCandidate;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  const thumb = resolvePublicImageUrl(candidate.image);

  return (
    <button
      type="button"
      onClick={() => onSelect(candidate.id)}
      aria-pressed={selected}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-canvas-soft text-left transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-md',
        selected ? 'border-primary ring-2 ring-primary/40' : 'border-gallery-hairline'
      )}
    >
      <div className="relative aspect-square w-full overflow-hidden bg-canvas-strong">
        {thumb ? (
          <SafeImage src={thumb} alt="" fill className="object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-charcoal-muted">
            이미지 없음
          </div>
        )}
      </div>
      <div className="space-y-1 p-2.5">
        <p className="truncate text-sm font-medium text-charcoal-deep">
          {candidate.title ?? '무제'}
        </p>
        <p className="truncate text-xs text-charcoal-muted">
          {candidate.artistName ?? '작가 미상'}
        </p>
        <PostHistoryBadge
          postCount={candidate.postCount}
          lastPublishedAt={candidate.lastPublishedAt}
        />
      </div>
    </button>
  );
}
