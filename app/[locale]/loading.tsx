export default function HomeLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero */}
      <div className="relative bg-charcoal min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-6 px-4">
          <div className="h-10 w-64 mx-auto animate-pulse rounded bg-white/10" />
          <div className="h-6 w-80 mx-auto animate-pulse rounded bg-white/10" />
          <div className="flex gap-4 justify-center mt-8">
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white py-16">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="text-center space-y-3 p-6">
                <div className="h-12 w-24 mx-auto animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-32 mx-auto animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-canvas-soft py-16">
        <div className="container-max">
          <div className="h-8 w-56 mx-auto animate-pulse rounded bg-gray-200 mb-10" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-8 shadow-sm space-y-4">
                <div className="h-6 w-28 animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-10 w-32 animate-pulse rounded-full bg-gray-200 mt-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
