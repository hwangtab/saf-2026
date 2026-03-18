export default function AdminContentFaqLoading() {
  return (
    <div aria-hidden="true" className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="h-7 w-16 animate-pulse rounded bg-slate-200" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-100" />
      </div>
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white/90 shadow-sm p-5">
            <div className="flex items-center justify-between">
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200" />
              <div className="h-4 w-4 animate-pulse rounded bg-slate-100" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
