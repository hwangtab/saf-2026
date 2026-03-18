export default function ArtistPageLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero skeleton */}
      <div className="relative bg-gray-200 py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-48 mx-auto animate-pulse rounded bg-gray-300" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-gray-300" />
          <div className="h-5 w-64 mx-auto animate-pulse rounded bg-gray-300/70" />
        </div>
      </div>

      {/* Gallery skeleton */}
      <div className="bg-primary-surface/30 py-12 md:py-16">
        <div className="container-max">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between mb-8">
            <div className="h-10 w-full md:w-72 animate-pulse rounded-lg bg-gray-200" />
            <div className="flex gap-2">
              <div className="h-9 w-16 animate-pulse rounded-full bg-gray-200" />
              <div className="h-9 w-20 animate-pulse rounded-full bg-gray-200" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-white overflow-hidden shadow-sm">
                <div className="aspect-[3/4] animate-pulse bg-gray-200" />
                <div className="p-4 space-y-2">
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                  <div className="h-5 w-40 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-28 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
