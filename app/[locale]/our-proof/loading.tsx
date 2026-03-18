export default function OurProofLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero — charcoal matching PageHero */}
      <div className="relative bg-charcoal py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-40 mx-auto animate-pulse rounded bg-white/20" />
          <div className="h-5 w-96 mx-auto animate-pulse rounded bg-white/15" />
        </div>
      </div>

      {/* Primary surface section: 3 stat cards + quote block */}
      <div className="py-16 md:py-20 bg-gray-50">
        <div className="container-max space-y-12">
          <div className="max-w-3xl mx-auto text-center space-y-3">
            <div className="h-8 w-80 mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-full max-w-xl mx-auto animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-4/5 mx-auto animate-pulse rounded bg-gray-100" />
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-lg bg-white p-6 text-center space-y-2 shadow-sm">
                <div className="h-10 w-24 mx-auto animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-32 mx-auto animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
          {/* Quote block */}
          <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg border-l-4 border-gray-300 space-y-3">
            <div className="h-5 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="h-7 w-2/3 animate-pulse rounded bg-gray-200 mt-4" />
          </div>
        </div>
      </div>

      {/* Testimonials section */}
      <div className="py-16 md:py-20">
        <div className="container-max space-y-8">
          <div className="space-y-3 max-w-2xl">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-5 w-80 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-50 p-6 space-y-3">
                <div className="h-4 w-full animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-5/6 animate-pulse rounded bg-gray-100" />
                <div className="h-4 w-3/4 animate-pulse rounded bg-gray-100" />
                <div className="h-3 w-28 animate-pulse rounded bg-gray-200 mt-4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
