export default function ArchiveLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero — charcoal matching PageHero */}
      <div className="relative bg-charcoal py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-36 mx-auto animate-pulse rounded bg-white/20" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-white/15" />
        </div>
      </div>

      {/* 2-col archive image cards */}
      <div className="py-16 md:py-20 min-h-[60vh]">
        <div className="container-max space-y-10">
          <div className="h-8 w-40 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="bg-canvas-soft rounded-2xl overflow-hidden shadow-lg">
                <div className="aspect-[4/3] w-full animate-pulse bg-gray-200" />
                <div className="p-8 space-y-3">
                  <div className="h-7 w-32 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
                  <div className="mt-4 h-9 w-28 animate-pulse rounded-full bg-gray-200" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
