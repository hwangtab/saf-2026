export function ArtworkFormSkeleton() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white/90 p-6 shadow-sm space-y-8">
      {/* 이미지 업로드 — 가로 썸네일 행 (max 10개) */}
      <div className="space-y-2">
        <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
        <div className="flex gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-20 w-20 animate-pulse rounded-lg bg-gray-200 flex-shrink-0" />
          ))}
          <div className="h-20 w-20 animate-pulse rounded-lg bg-gray-100 flex-shrink-0 border-2 border-dashed border-gray-200" />
        </div>
      </div>

      {/* 텍스트 필드 8개 — md:grid-cols-2 */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
            <div className="h-10 w-full animate-pulse rounded bg-gray-100" />
          </div>
        ))}
      </div>

      {/* Textarea 1개 (작가 노트) */}
      <div className="space-y-2">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-200" />
        <div className="h-24 w-full animate-pulse rounded bg-gray-100" />
      </div>

      <div className="flex gap-3 pt-4 border-t border-gray-100">
        <div className="h-10 w-28 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-20 animate-pulse rounded bg-gray-100" />
      </div>
    </div>
  );
}
