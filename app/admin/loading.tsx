export default function AdminLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="h-8 w-36 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div className="h-6 w-28 animate-pulse rounded bg-slate-200" />
          <div className="h-10 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="space-y-3 p-6">
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
          <div className="h-12 animate-pulse rounded bg-slate-100" />
        </div>
      </div>

      <div className="flex items-center justify-center py-2">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
      </div>
    </div>
  );
}
