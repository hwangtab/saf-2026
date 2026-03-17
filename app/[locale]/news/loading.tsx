export default function NewsLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero */}
      <div className="bg-white py-16 md:py-20 text-center">
        <div className="container-max space-y-4">
          <div className="h-9 w-36 mx-auto animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-gray-100" />
          <div className="h-10 w-56 mx-auto animate-pulse rounded-full bg-gray-100 mt-6" />
        </div>
      </div>

      {/* Highlights */}
      <div className="bg-sun-soft/30 py-12 md:py-16">
        <div className="container-max">
          <div className="max-w-3xl mx-auto text-center mb-10">
            <div className="h-6 w-32 mx-auto animate-pulse rounded-full bg-gray-200 mb-4" />
            <div className="h-7 w-56 mx-auto animate-pulse rounded bg-gray-200 mb-3" />
            <div className="h-5 w-72 mx-auto animate-pulse rounded bg-gray-100" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
                <div className="h-3 w-32 animate-pulse rounded bg-gray-200 mb-4" />
                <div className="space-y-2 border-l-4 border-gray-200 pl-4">
                  <div className="h-5 w-full animate-pulse rounded bg-gray-100" />
                  <div className="h-5 w-3/4 animate-pulse rounded bg-gray-100" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
