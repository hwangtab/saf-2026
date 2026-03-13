type ArtworksRouteLoadingProps = {
  titleWidthClass?: string;
  subtitleWidthClass?: string;
};

export default function ArtworksRouteLoading({
  titleWidthClass = 'w-40',
  subtitleWidthClass = 'w-80',
}: ArtworksRouteLoadingProps) {
  return (
    <main className="min-h-screen bg-white">
      <div className="bg-white pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-12 md:pb-16">
        <div className="container-max py-12 text-center md:py-16">
          <div className={`mx-auto h-10 animate-pulse rounded bg-gray-200 ${titleWidthClass}`} />
          <div
            className={`mx-auto mt-4 h-5 animate-pulse rounded bg-gray-100 ${subtitleWidthClass}`}
          />
        </div>
      </div>

      <div className="bg-primary-surface py-14 md:py-16">
        <div className="container-max">
          <div className="mx-auto w-full max-w-xl rounded-2xl border border-gray-200/70 bg-white/80 px-6 py-7 shadow-sm md:px-8">
            <div className="flex items-center justify-center gap-3">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-primary" />
              <div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
            </div>
            <div className="mt-6 space-y-3">
              <div className="h-3 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-11/12 animate-pulse rounded bg-gray-100" />
              <div className="h-3 w-4/5 animate-pulse rounded bg-gray-100" />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
