'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Palette } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';

// error boundary는 streaming 오류 중에도 렌더되므로 next-intl provider에 의존하지 않고
// pathname으로 locale을 판별해 카피를 인라인 제공한다. (형제 artist/error.tsx와 동일 패턴)
const COPY = {
  ko: {
    title: '카테고리를 표시할 수 없습니다',
    body: '일시적인 문제가 발생했거나 존재하지 않는 카테고리입니다. 전체 작품을 둘러보세요.',
    retry: '다시 시도',
    viewAll: '전체 작품 보기',
  },
  en: {
    title: 'Unable to display this category',
    body: 'A temporary problem occurred, or this category does not exist. Please browse all artworks.',
    retry: 'Try again',
    viewAll: 'View all artworks',
  },
} as const;

/**
 * Segment error boundary — RSC streaming throw 흡수.
 * 존재하지 않는 카테고리·일시적 Supabase 에러 시 internal 500 대신 fallback UI 노출.
 */
export default function CategoryError({ error, reset }: { error: Error; reset: () => void }) {
  const pathname = usePathname();
  const copy = pathname?.startsWith('/en') ? COPY.en : COPY.ko;

  useEffect(() => {
    console.error('[category-page] streaming error boundary triggered:', error.stack ?? error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <div className="max-w-md px-6 text-center">
        <Palette aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="mb-4 text-2xl font-bold text-charcoal">{copy.title}</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">{copy.body}</p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg border border-gallery-hairline px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-canvas-strong transition-colors"
          >
            {copy.retry}
          </button>
          <LinkButton href="/artworks" variant="primary">
            {copy.viewAll}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
