export default function AdminNewArtistLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div>
        <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
        <div className="mt-2 h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-8">
        {/* 이미지 + 사용자 연결 2열 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-3">
            <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
            <div className="flex items-center gap-4">
              <div className="h-20 w-20 animate-pulse rounded-full bg-slate-200 flex-shrink-0" />
              <div className="h-9 w-28 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        {/* 텍스트 필드 6개 — md:grid-cols-2, 홈페이지는 col-span-2 */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {[...Array(6)].map((_, i) => (
            <div key={i} className={`space-y-2 ${i === 4 ? 'md:col-span-2' : ''}`}>
              <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
              <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>

        {/* Textarea 2개 (소개 / 이력) */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-16 animate-pulse rounded bg-slate-200" />
            <div className="h-32 w-full animate-pulse rounded bg-slate-100" />
          </div>
        </div>

        <div className="flex gap-3 pt-4 border-t border-slate-100">
          <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
        </div>
      </div>
    </div>
  );
}
