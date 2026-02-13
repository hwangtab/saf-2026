export default function ExhibitorDashboardLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-36 animate-pulse rounded bg-stone-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-stone-100" />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
          <div className="mt-4 h-10 w-20 animate-pulse rounded bg-stone-200" />
        </div>
        <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
          <div className="h-4 w-28 animate-pulse rounded bg-stone-100" />
          <div className="mt-4 h-10 w-20 animate-pulse rounded bg-stone-200" />
        </div>
      </div>
    </div>
  );
}
