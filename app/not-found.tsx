import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: '페이지를 찾을 수 없습니다',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft pt-20">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">🔍</div>
        <h1 className="text-2xl font-bold text-charcoal mb-4">페이지를 찾을 수 없습니다</h1>
        <p className="text-charcoal-muted mb-8 leading-relaxed">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
          <br />
          주소를 다시 확인하시거나 홈으로 이동해 주세요.
        </p>
        <Link
          href="/"
          className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary-strong text-white font-bold rounded-lg transition-colors shadow-sm hover:shadow-md active:scale-[0.98]"
        >
          홈으로 이동
        </Link>
      </div>
    </div>
  );
}
