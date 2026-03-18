export default function ArtworkEditLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-4xl space-y-6 rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8"
    >
      {/* 이미지 업로드 행 */}
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="h-20 w-20 flex-shrink-0 animate-pulse rounded-lg bg-slate-200"
            />
          ))}
        </div>
      </div>
      {/* 필드 8개 2열 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
      {/* textarea */}
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
      </div>
      {/* 버튼 행 */}
      <div className="flex gap-3 border-t border-slate-100 pt-4">
        <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
