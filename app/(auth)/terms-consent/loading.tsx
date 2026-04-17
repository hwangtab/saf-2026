import { SAWTOOTH_TOP_SAFE_PADDING } from '@/components/ui/SawtoothDivider';

export default function TermsConsentLoading() {
  return (
    <div
      aria-hidden="true"
      className={`min-h-screen bg-canvas-soft px-4 pt-24 ${SAWTOOTH_TOP_SAFE_PADDING}`}
    >
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="space-y-3">
            <div className="h-8 w-48 animate-pulse rounded bg-gray-200" />
            <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
          </div>
          <div className="h-9 w-24 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-3 rounded-2xl border border-gray-200 bg-white p-5">
              <div className="h-5 w-36 animate-pulse rounded bg-gray-200" />
              <div className="h-16 w-full animate-pulse rounded bg-gray-100" />
              <div className="h-9 w-full animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
