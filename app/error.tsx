'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Global Error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
      timestamp: new Date().toISOString(),
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft pt-20">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">⚠️</div>
        <h2 className="text-2xl font-bold text-charcoal mb-4">문제가 발생했습니다</h2>
        <p className="text-charcoal-muted mb-6">
          페이지를 불러오는 중 예상치 못한 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <div className="space-y-3">
          <button
            onClick={() => reset()}
            className="w-full px-6 py-3 bg-primary hover:bg-primary-strong text-white font-bold rounded-lg transition-colors"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="block w-full px-6 py-3 bg-white border border-gray-300 hover:bg-gray-50 text-charcoal font-bold rounded-lg transition-colors"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
