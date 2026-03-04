export default function ArtworksLoading() {
  return (
    <main className="min-h-screen">
      {/* Hero skeleton */}
      <div className="bg-white pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-16">
        <div className="container-max text-center space-y-4 py-16">
          <div className="h-10 w-32 animate-pulse rounded bg-gray-200 mx-auto" />
          <div className="h-5 w-96 animate-pulse rounded bg-gray-100 mx-auto" />
        </div>
      </div>

      {/* Gallery skeleton */}
      <div className="bg-[var(--color-primary-surface)] py-16">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-200 rounded-sm animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
