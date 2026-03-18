export default function AdminAnalyticsLoading() {
  return (
    <div aria-hidden="true" className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="h-8 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-slate-100" />
        </div>
        <div className="flex items-center gap-3">
          <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
          <div className="flex gap-1">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-9 w-16 animate-pulse rounded bg-slate-200" />
            ))}
          </div>
        </div>
      </div>

      {/* 4 stat cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm space-y-3"
          >
            <div className="h-4 w-24 animate-pulse rounded bg-slate-100" />
            <div className="h-9 w-20 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Daily views — full width */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="h-5 w-36 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-64 animate-pulse rounded bg-slate-100" />
      </div>

      {/* Hourly heatmap — full width */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-40 animate-pulse rounded bg-slate-100" />
      </div>

      {/* Top pages + device pie */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <div className="h-5 w-28 animate-pulse rounded bg-slate-200 mb-4" />
            <div className="h-56 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>

      {/* Browser/OS — full width */}
      <div className="rounded-2xl border border-slate-200 bg-white/90 p-6 shadow-sm">
        <div className="h-5 w-32 animate-pulse rounded bg-slate-200 mb-4" />
        <div className="h-48 animate-pulse rounded bg-slate-100" />
      </div>
    </div>
  );
}
