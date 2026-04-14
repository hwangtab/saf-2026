export default function PublicPageLoading() {
  return (
    <div aria-hidden="true">
      {/* PageHero skeleton */}
      <div className="relative min-h-[60vh] flex items-center justify-center bg-charcoal animate-pulse">
        <div className="text-center w-full container-max px-4">
          <div className="h-12 md:h-16 w-2/3 max-w-lg mx-auto rounded bg-white/10 mb-4" />
          <div className="h-5 w-1/2 max-w-sm mx-auto rounded bg-white/10" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="bg-white py-12 md:py-20">
        <div className="container-max px-4 space-y-6">
          <div className="h-8 w-1/3 mx-auto rounded bg-gray-100 animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
