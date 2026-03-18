export default function ArtworkDetailLoading() {
  return (
    <div aria-hidden="true" className="pb-24 md:pb-32 pt-[calc(4rem+env(safe-area-inset-top,0px))]">
      {/* Breadcrumb nav skeleton */}
      <div className="border-b border-gray-100 py-3">
        <div className="container-max flex items-center gap-2">
          <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-4 animate-pulse rounded bg-gray-100" />
          <div className="h-4 w-28 animate-pulse rounded bg-gray-200" />
        </div>
      </div>

      <div className="container-max pt-12 md:pt-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">
          {/* Left: Image */}
          <div className="space-y-6">
            <div className="aspect-square animate-pulse rounded-xl bg-gray-200" />
            <div className="flex justify-center gap-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-9 w-9 animate-pulse rounded-full bg-gray-200" />
              ))}
            </div>
            {/* CTA buttons (mobile only) */}
            <div className="block lg:hidden space-y-3">
              <div className="h-5 w-40 mx-auto animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-28 mx-auto animate-pulse rounded bg-gray-200" />
              <div className="h-14 w-full animate-pulse rounded-xl bg-gray-200" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
                <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
              </div>
            </div>
          </div>

          {/* Right: Info */}
          <div className="space-y-8">
            <div className="hidden lg:block space-y-3 pb-6 border-b border-gray-100">
              <div className="h-9 w-3/4 animate-pulse rounded bg-gray-200" />
              <div className="h-6 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="border-t border-b border-gray-100 py-6 space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="grid grid-cols-[80px_1fr] gap-4">
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 animate-pulse rounded bg-gray-200" />
                </div>
              ))}
            </div>
            <div className="bg-gray-50 p-6 rounded-xl space-y-3">
              <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-4 animate-pulse rounded bg-gray-100" />
              ))}
              <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100" />
            </div>
            {/* Desktop CTA buttons */}
            <div className="hidden lg:block space-y-4">
              <div className="h-14 w-full animate-pulse rounded-xl bg-gray-200" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
                <div className="h-12 animate-pulse rounded-lg bg-gray-200" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
