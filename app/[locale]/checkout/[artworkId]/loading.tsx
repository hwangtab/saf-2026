export default function CheckoutLoading() {
  return (
    <div className="bg-canvas-soft">
      <div className="max-w-2xl mx-auto px-4 pt-24 pb-24">
        {/* Back button skeleton */}
        <div className="mb-6 h-5 w-28 rounded bg-gray-200 animate-pulse" />

        {/* Title skeleton */}
        <div className="mb-6 h-8 w-40 rounded bg-gray-200 animate-pulse" />

        {/* Artwork summary skeleton */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="h-24 w-24 shrink-0 rounded-lg bg-gray-200 animate-pulse" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-20 rounded bg-gray-200 animate-pulse" />
              <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
              <div className="h-6 w-32 rounded bg-gray-200 animate-pulse" />
            </div>
          </div>
        </div>

        {/* Form skeleton */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-4">
          <div className="h-5 w-32 rounded bg-gray-200 animate-pulse" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-11 w-full rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>

        {/* Price breakdown skeleton */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
          <div className="h-5 w-24 rounded bg-gray-200 animate-pulse" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>

        {/* Payment method skeleton */}
        <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="h-5 w-32 rounded bg-gray-200 animate-pulse mb-4" />
          <div className="grid grid-cols-3 gap-3 pt-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>

        {/* CTA skeleton */}
        <div className="h-14 w-full rounded-xl bg-gray-200 animate-pulse" />
      </div>
    </div>
  );
}
