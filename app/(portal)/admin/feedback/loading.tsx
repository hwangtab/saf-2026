export default function AdminFeedbackLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="space-y-2">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-4 w-48 animate-pulse rounded bg-slate-100" />
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div className="h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-20 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
