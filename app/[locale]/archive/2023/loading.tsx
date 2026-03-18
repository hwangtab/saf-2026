export default function Archive2023Loading() {
  return (
    <div aria-hidden="true" className="py-24 md:py-32">
      <div className="container-max space-y-12">
        <div className="space-y-4">
          <div className="h-8 w-56 animate-pulse rounded bg-gray-200" />
          <div className="h-5 w-96 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="w-full aspect-video animate-pulse rounded-2xl bg-gray-200" />
        <div className="bg-white rounded-lg p-8 space-y-6">
          <div className="h-6 w-40 animate-pulse rounded bg-gray-200" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center space-y-2">
                <div className="h-8 w-16 mx-auto animate-pulse rounded bg-gray-200" />
                <div className="h-4 w-20 mx-auto animate-pulse rounded bg-gray-100" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
