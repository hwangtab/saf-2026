import Section from '@/components/ui/Section';

export default function NewsLoading() {
  return (
    <>
      <div className="bg-charcoal text-white pt-32 pb-16 md:pt-40 md:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-12 w-48 bg-white/10 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <Section variant="sun-soft" prevVariant="white">
        <div className="container-max flex flex-col gap-8">
          <div className="max-w-3xl space-y-4">
            <div className="h-6 w-32 rounded-full shimmer-loading" />
            <div className="h-10 w-full md:w-2/3 rounded shimmer-loading" />
            <div className="h-16 w-full rounded shimmer-loading" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(2)].map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <div className="h-4 w-24 rounded mb-4 shimmer-loading" />
                <div className="space-y-3">
                  <div className="h-4 w-full rounded shimmer-loading" />
                  <div className="h-4 w-full rounded shimmer-loading" />
                  <div className="h-4 w-2/3 rounded shimmer-loading" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>

      <Section variant="primary-surface" prevVariant="sun-soft" className="pb-24 md:pb-32">
        <div className="container-max">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[...Array(4)].map((_, i) => (
              <div
                key={i}
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm"
              >
                <div className="aspect-video shimmer-loading" />
                <div className="p-6 space-y-4">
                  <div className="flex justify-between">
                    <div className="h-3 w-16 rounded shimmer-loading" />
                    <div className="h-3 w-24 rounded shimmer-loading" />
                  </div>
                  <div className="h-6 w-3/4 rounded shimmer-loading" />
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded shimmer-loading" />
                    <div className="h-3 w-full rounded shimmer-loading" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
