export default function ExhibitorDashboardLoading() {
  return (
    <div className="space-y-6">
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
  );
}
