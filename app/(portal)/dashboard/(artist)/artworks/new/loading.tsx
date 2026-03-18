export default function NewArtworkLoading() {
  return (
    <div
      aria-hidden="true"
      className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm sm:p-8 space-y-8"
    >
      {/* 제목 */}
      <div className="space-y-1">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-56 animate-pulse rounded bg-slate-100" />
      </div>

      {/* 이미지 업로드 — 가로 썸네일 행 (최대 5장) */}
      <div className="space-y-2">
        <div className="h-4 w-28 animate-pulse rounded bg-slate-200" />
        <div className="flex gap-3">
          <div className="h-20 w-20 animate-pulse rounded-lg bg-slate-100 flex-shrink-0 border-2 border-dashed border-slate-200" />
        </div>
      </div>

      {/* 텍스트 필드 + 셀렉트 (2열) */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Textarea (작가 노트) */}
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-slate-200" />
        <div className="h-24 w-full animate-pulse rounded bg-slate-100" />
      </div>

      <div className="flex gap-3 pt-4 border-t border-slate-100">
        <div className="h-10 w-28 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-20 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
