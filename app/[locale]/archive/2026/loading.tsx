export default function Archive2026Loading() {
  return (
    <div aria-hidden="true">
      <div className="container-max py-24 md:py-32 space-y-12">
        <div className="space-y-3">
          <div className="h-5 w-80 animate-pulse rounded bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-4">
          <div className="h-7 w-48 animate-pulse rounded bg-gray-200" />
          <div className="w-full aspect-video animate-pulse rounded-2xl bg-gray-200" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex gap-4">
                  <div className="h-14 w-1 animate-pulse bg-gray-300 rounded" />
                  <div className="space-y-2 flex-1">
                    <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
                    <div className="h-5 w-full animate-pulse rounded bg-gray-100" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-64 animate-pulse rounded-xl bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
