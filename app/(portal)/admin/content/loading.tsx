export default function AdminContentLoading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-200" />
        <div className="h-10 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>

      <div className="flex gap-2 border-b border-slate-200 pb-0">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-9 w-20 animate-pulse rounded-t bg-slate-100" />
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex items-start gap-4 px-6 py-5">
              <div className="h-16 w-16 animate-pulse rounded bg-slate-200 flex-shrink-0" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-2/3 animate-pulse rounded bg-slate-200" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-3/4 animate-pulse rounded bg-slate-100" />
              </div>
              <div className="flex gap-2 flex-shrink-0">
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
                <div className="h-8 w-16 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
