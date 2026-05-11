'use client';

import { useEffect } from 'react';
import { Palette } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';

/**
 * Segment error boundary — RSC streaming throw 흡수.
 * 존재하지 않는 카테고리·일시적 Supabase 에러 시 internal 500 대신 fallback UI 노출.
 */
export default function CategoryError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[category-page] streaming error boundary triggered:', error.stack ?? error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <div className="max-w-md px-6 text-center">
        <Palette aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="mb-4 text-2xl font-bold text-charcoal">카테고리를 표시할 수 없습니다</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">
          일시적인 문제가 발생했거나 존재하지 않는 카테고리입니다. 전체 작품을 둘러보세요.
        </p>
        <div className="flex justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg border border-gallery-hairline px-5 py-2.5 text-sm font-medium text-charcoal hover:bg-canvas-strong transition-colors"
          >
            다시 시도
          </button>
          <LinkButton href="/artworks" variant="primary">
            전체 작품 보기
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
