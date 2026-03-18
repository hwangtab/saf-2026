export default function AdminNewArtworkLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-8">
        {/* 이미지 업로드 — 가로 썸네일 행 */}
        <div className="space-y-2">
          <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
          <div className="flex gap-3">
            <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-100 flex-shrink-0 border-2 border-dashed border-slate-200" />
          </div>
        </div>

        {/* 텍스트 필드 8개 — md:grid-cols-2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Textarea 1개 (작가 노트) */}
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
          <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
