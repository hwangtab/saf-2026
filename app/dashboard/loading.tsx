export default function ArtistDashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />

      {/* Nav skeleton */}
      <div className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="h-7 w-24 animate-pulse rounded bg-slate-200" />
            <div className="hidden gap-4 sm:flex">
              <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-6 w-24 animate-pulse rounded-full bg-green-50 sm:block" />
            <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto mt-16 max-w-7xl space-y-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        <div className="space-y-3">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-72 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
            <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-44 animate-pulse rounded bg-slate-100" />
          </div>
          <div className="space-y-3 p-6">
            <div className="h-12 animate-pulse rounded bg-slate-100" />
            <div className="h-12 animate-pulse rounded bg-slate-100" />
            <div className="h-12 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>
    </div>
  );
}
