export default function Archive2023Loading() {
  return (
    <div aria-hidden="true">
      {/* PageHero — charcoal matching PageHero */}
      <div className="relative bg-charcoal py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-48 mx-auto animate-pulse rounded bg-white/20" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-white/15" />
        </div>
      </div>

      {/* sun-soft 섹션: 세로형 포스터 + 통계 4개 */}
      <div className="py-16 md:py-20 bg-sun-soft">
        <div className="container-max space-y-10">
          <div className="h-8 w-48 animate-pulse rounded bg-amber-200" />
          {/* 세로형 포스터 (1200×1700 ≈ 3:4 비율) */}
          <div className="max-w-xs mx-auto aspect-[3/4] animate-pulse rounded-2xl bg-amber-200/70 shadow-xl" />
          {/* 4 stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-9 w-20 mx-auto animate-pulse rounded bg-amber-200/80" />
                <div className="h-4 w-16 mx-auto animate-pulse rounded bg-amber-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* gray 섹션: 출품작 카드 3열 */}
      <div className="py-16 md:py-20 bg-gray-50">
        <div className="container-max space-y-8">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden bg-white shadow-sm">
                <div className="aspect-[4/5] animate-pulse bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
