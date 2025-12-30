'use client';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-canvas-soft">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-6">😔</div>
        <h2 className="text-2xl font-bold text-charcoal mb-4">문제가 발생했습니다</h2>
        <p className="text-charcoal-muted mb-6">
          페이지를 불러오는 중 오류가 발생했습니다.
          <br />
          잠시 후 다시 시도해 주세요.
        </p>
        <button
          onClick={() => reset()}
          className="px-6 py-3 bg-primary hover:bg-primary-strong text-white font-bold rounded-lg transition-colors"
        >
          다시 시도
        </button>
      </div>
    </div>
  );
}
