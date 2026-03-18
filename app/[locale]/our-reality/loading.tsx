export default function OurRealityLoading() {
  return (
    <div aria-hidden="true">
      {/* Hero — charcoal matching PageHero */}
      <div className="relative bg-charcoal py-20 md:py-28">
        <div className="container-max text-center space-y-4">
          <div className="h-10 w-48 mx-auto animate-pulse rounded bg-white/20" />
          <div className="h-5 w-80 mx-auto animate-pulse rounded bg-white/15" />
        </div>
      </div>

      {/* 3 stages × 2 charts each */}
      {[...Array(3)].map((_, s) => (
        <div key={s} className="py-16 md:py-20 border-t border-gray-100">
          <div className="container-max">
            <div className="mb-10 space-y-3">
              <div className="h-3 w-16 animate-pulse rounded bg-gray-300" />
              <div className="h-8 w-72 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-96 animate-pulse rounded bg-gray-100" />
            </div>
            <div className="grid md:grid-cols-2 gap-12">
              <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
              <div className="h-96 animate-pulse rounded-xl bg-gray-100" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
