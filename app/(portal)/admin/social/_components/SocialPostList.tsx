'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import SafeImage from '@/components/common/SafeImage';
import {
  deleteSocialPost,
  retrySocialPost,
  type SocialPostListItem,
} from '@/app/actions/admin-social';
import { resolvePublicImageUrl } from '@/lib/social/image-url';
import { AdminCard, AdminEmptyState } from '@/app/(portal)/admin/_components/admin-ui';
import { PlatformBadge, StatusBadge } from './PlatformBadge';

function formatDateTime(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function SocialPostList({ initial }: { initial: SocialPostListItem[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (initial.length === 0) {
    return (
      <AdminCard className="p-6">
        <AdminEmptyState
          title="게시 이력이 없습니다"
          description="위에서 첫 게시를 만들어 보세요."
        />
      </AdminCard>
    );
  }

  const handleRetry = (id: string) => {
    setBusyId(id);
    startTransition(async () => {
      await retrySocialPost(id);
      setBusyId(null);
      router.refresh();
    });
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('이 게시 이력을 삭제할까요? (실제 게시물은 삭제되지 않습니다)')) return;
    setBusyId(id);
    startTransition(async () => {
      await deleteSocialPost(id);
      setBusyId(null);
      router.refresh();
    });
  };

  return (
    <div className="space-y-3">
      {initial.map((post) => {
        const thumb = resolvePublicImageUrl(post.artworkImage) ?? post.imageUrl;
        const rowBusy = isPending && busyId === post.id;
        return (
          <AdminCard key={post.id} className="p-4">
            <div className="flex gap-4">
              <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gallery-hairline bg-canvas-strong">
                {thumb ? (
                  <SafeImage src={thumb} alt="" fill className="object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-charcoal-soft">
                    이미지 없음
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <PlatformBadge platform={post.platform} />
                  <StatusBadge status={post.status} />
                  {post.artworkTitle && (
                    <span className="truncate text-sm font-medium text-charcoal-deep">
                      {post.artworkTitle}
                    </span>
                  )}
                </div>

                <p className="line-clamp-2 whitespace-pre-wrap text-sm text-charcoal-muted">
                  {post.caption}
                </p>

                {post.status === 'failed' && post.errorMessage && (
                  <p className="mt-1 text-xs text-danger-a11y">{post.errorMessage}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-charcoal-soft">
                  <span>{formatDateTime(post.publishedAt ?? post.createdAt)}</span>
                  {post.permalink && (
                    <a
                      href={post.permalink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-primary-strong hover:underline"
                    >
                      게시물 보기 ↗
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleRetry(post.id)}
                    disabled={rowBusy}
                    className="font-medium text-primary-strong hover:underline disabled:opacity-50"
                  >
                    {post.status === 'failed' ? '재시도' : '다시 게시'}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id)}
                    disabled={rowBusy}
                    className="font-medium text-danger-a11y hover:underline disabled:opacity-50"
                  >
                    삭제
                  </button>
                </div>
              </div>
            </div>
          </AdminCard>
        );
      })}
    </div>
  );
}
