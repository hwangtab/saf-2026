import { Link } from '@/i18n/navigation';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '작가를 찾을 수 없습니다',
  robots: { index: false, follow: true },
};

export default function ArtistNotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas-soft pt-20">
      <div className="max-w-md px-6 text-center">
        <div className="mb-6 text-6xl">🎨</div>
        <h1 className="mb-4 text-2xl font-bold text-charcoal">작가를 찾을 수 없습니다</h1>
        <p className="mb-8 leading-relaxed text-charcoal-muted">
          요청하신 작가의 작품이 존재하지 않거나 이동되었습니다.
          <br />
          작품 목록에서 다른 작가의 작품을 둘러보세요.
        </p>
        <Link
          href="/artworks"
          className="inline-grid min-h-[48px] grid-cols-[1.25rem_auto_1.25rem] items-center gap-2 rounded-lg bg-primary px-6 py-3 font-bold text-white shadow-sm transition-colors hover:bg-primary-strong hover:shadow-md"
        >
          <span aria-hidden="true">🖼️</span>
          <span>작품 목록으로</span>
          <span aria-hidden="true" className="invisible">
            🖼️
          </span>
        </Link>
      </div>
    </div>
  );
}
