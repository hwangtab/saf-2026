'use client';

import { useEffect } from 'react';
import { Palette } from 'lucide-react';
import LinkButton from '@/components/ui/LinkButton';

/**
 * Segment error boundary — RSC streaming 단계에서 page body의 outer try/catch가 catch하지
 * 못한 throw를 흡수하는 안전망. multi-root layout 패턴(2026-05 refactor) 적용 후 일부
 * 작가 페이지(류연복·송광호·이문호·양운규·박불똥 등)가 'TypeError: Invalid character'
 * throw로 Next.js internal 500 페이지로 흘러가던 회귀 차단.
 *
 * x-matched-path가 /500이 아닌 이 boundary로 매칭되면 200 응답 + noindex fallback UI.
 * 정확한 origin은 console.error로 보존되어 운영 로그에서 추적 가능.
 */
export default function ArtistError({ error, reset }: { error: Error; reset: () => void }) {
  useEffect(() => {
    console.error('[artist-page] streaming error boundary triggered:', error.stack ?? error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <div className="max-w-md px-6 text-center">
        <Palette aria-hidden="true" className="mx-auto h-16 w-16 text-charcoal-muted mb-6" />
        <h1 className="mb-4 text-2xl font-bold text-charcoal">작가 페이지를 표시할 수 없습니다</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">
          일시적인 문제가 발생했습니다. 잠시 후 다시 시도하거나 전체 작품을 둘러보세요.
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
