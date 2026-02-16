export default function ExhibitorDashboardLoading() {
  return (
    <div className="min-h-screen bg-[var(--admin-bg)]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top,#e0e7ff_0%,#f8fafc_38%,#f1f5f9_100%)]" />

      {/* Nav skeleton */}
      <div className="fixed left-0 top-0 z-30 w-full border-b border-slate-200/90 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <div className="h-7 w-28 animate-pulse rounded bg-slate-200" />
            <div className="hidden gap-4 sm:flex">
              <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
              <div className="h-5 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden h-6 w-28 animate-pulse rounded-full bg-amber-50 sm:block" />
            <div className="h-8 w-20 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      </div>

      {/* Content skeleton */}
      <div className="mx-auto mt-16 max-w-7xl space-y-6 px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24">
        <div className="space-y-3">
          <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded bg-slate-200" />
          </div>
          <div className="rounded-2xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-6 shadow-sm">
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="mt-4 h-10 w-20 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
