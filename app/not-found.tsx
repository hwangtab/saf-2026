import Link from 'next/link';
import type { Metadata } from 'next';
import { CONTACT } from '@/lib/constants';

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
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
          <Link
            href="/"
            className="inline-flex items-center justify-center px-6 py-3 bg-white border border-gray-200 text-gray-900 font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm min-h-[48px]"
          >
            홈으로 이동
          </Link>
          <Link
            href="/artworks"
            className="inline-flex items-center justify-center px-6 py-3 bg-primary hover:bg-primary-strong text-white font-bold rounded-lg transition-colors shadow-sm hover:shadow-md min-h-[48px]"
          >
            🎨 작품 둘러보기
          </Link>
        </div>

        <div className="pt-8 border-t border-gray-200/60">
          <p className="text-sm text-gray-500 mb-2">도움이 필요하신가요?</p>
          <a href={`mailto:${CONTACT.EMAIL}`} className="text-primary font-medium hover:underline">
            {CONTACT.EMAIL}
          </a>
        </div>
      </div>
    </div>
  );
}
