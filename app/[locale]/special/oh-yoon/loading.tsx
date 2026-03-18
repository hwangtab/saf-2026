export default function OhYoonLoading() {
  return (
    <div aria-hidden="true" className="w-full bg-canvas-soft min-h-screen font-sans">
      {/* Hero skeleton */}
      <section className="relative w-full py-20 md:py-32 px-4 bg-canvas border-b-8 border-double border-charcoal/20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Badge */}
          <div className="inline-block h-10 w-44 animate-pulse rounded bg-gray-200" />
          {/* Title */}
          <div className="space-y-3">
            <div className="h-14 md:h-20 w-3/4 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-14 md:h-20 w-1/2 mx-auto animate-pulse rounded bg-gray-200" />
          </div>
          {/* Subtitle */}
          <div className="space-y-2 pt-4 border-t-2 border-b-2 border-charcoal/15 py-5">
            <div className="h-5 w-80 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-64 mx-auto animate-pulse rounded bg-gray-200" />
          </div>
        </div>
      </section>

      {/* Quote + Bio skeleton */}
      <div className="max-w-[1440px] mx-auto px-4 py-16 md:py-24 space-y-20">
        {/* Quote */}
        <div className="flex justify-center">
          <div className="w-full max-w-4xl border-4 border-charcoal/20 bg-white p-10 md:p-16 space-y-4">
            <div className="h-10 md:h-14 w-3/4 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-10 md:h-14 w-1/2 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-16 mx-auto animate-pulse rounded bg-gray-300 mt-6" />
          </div>
        </div>

        {/* Bio 2-column */}
        <div className="grid md:grid-cols-2 gap-12 md:gap-24">
          <div className="space-y-6">
            <div className="h-10 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="h-6 w-full animate-pulse rounded bg-gray-200" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-4/5 animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="border-4 border-charcoal/20 bg-white p-8 md:p-12 space-y-6">
            <div className="h-7 w-32 animate-pulse rounded bg-gray-200 border-b-2 border-gray-200 pb-4" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="shrink-0 w-10 h-10 animate-pulse rounded-full bg-gray-200" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Gallery skeleton (dark section) */}
      <div className="py-20 bg-[#2a3032]">
        <div className="max-w-[1440px] mx-auto px-4">
          <div className="mb-16 border-b border-white/20 pb-8 flex justify-between items-end">
            <div className="space-y-3">
              <div className="h-12 w-36 animate-pulse rounded bg-white/20" />
              <div className="h-5 w-48 animate-pulse rounded bg-white/10" />
            </div>
            <div className="h-4 w-32 animate-pulse rounded bg-white/10" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-lg bg-white/10" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
