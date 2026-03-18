export default function TransparencyLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero — charcoal matching PageHero */}
      <div className="relative bg-charcoal py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-48 mx-auto animate-pulse rounded bg-white/20" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-white/15" />
        </div>
      </div>

      {/* Annual report cards — md:grid-cols-3 */}
      <div className="py-16 md:py-20 bg-gray-50">
        <div className="container-max space-y-10">
          <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 flex flex-col space-y-4"
              >
                {/* Year + date */}
                <div className="flex items-center gap-3">
                  <div className="h-9 w-16 animate-pulse rounded bg-gray-200" />
                  <div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
                </div>
                {/* Title */}
                <div className="h-5 w-4/5 animate-pulse rounded bg-gray-200" />
                {/* Summary lines */}
                <div className="space-y-2 flex-1">
                  <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-5/6 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-3/4 animate-pulse rounded bg-gray-100" />
                </div>
                {/* 3 mini stats */}
                <div className="grid grid-cols-3 gap-2">
                  {[...Array(3)].map((_, j) => (
                    <div key={j} className="text-center space-y-1">
                      <div className="h-5 w-10 mx-auto animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-8 mx-auto animate-pulse rounded bg-gray-100" />
                    </div>
                  ))}
                </div>
                {/* Download button */}
                <div className="h-9 w-full animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Year-on-year growth table */}
      <div className="py-16 md:py-20">
        <div className="container-max space-y-8">
          <div className="text-center space-y-3">
            <div className="h-8 w-56 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-96 mx-auto animate-pulse rounded bg-gray-100" />
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Table header */}
            <div className="flex bg-gray-100 border-b-2 border-gray-300 px-6 py-4 gap-4">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`h-4 animate-pulse rounded bg-gray-300 ${i === 0 ? 'w-16' : 'flex-1'}`}
                />
              ))}
            </div>
            {/* Table rows */}
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex px-6 py-4 gap-4 border-b border-gray-100 last:border-0">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
                {[...Array(4)].map((_, j) => (
                  <div key={j} className="flex-1 h-4 animate-pulse rounded bg-gray-100" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
