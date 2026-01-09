import Section from '@/components/ui/Section';

export default function ArchiveLoading() {
  return (
    <>
      <div className="bg-charcoal text-white pt-32 pb-16 md:pt-40 md:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-12 w-48 bg-white/10 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <Section variant="sun-soft" prevVariant="white">
        <div className="container-max">
          <div className="h-8 w-64 rounded shimmer-loading mb-12" />
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12">
            <div className="h-6 w-48 rounded shimmer-loading mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-8 w-16 rounded shimmer-loading" />
                  <div className="h-4 w-12 rounded shimmer-loading" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full rounded shimmer-loading" />
              <div className="h-4 w-5/6 rounded shimmer-loading" />
            </div>
          </div>
        </div>
      </Section>

      <Section variant="gray" prevVariant="sun-soft">
        <div className="container-max">
          <div className="h-8 w-48 rounded shimmer-loading mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="aspect-square shimmer-loading" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 rounded shimmer-loading" />
                  <div className="h-4 w-1/2 rounded shimmer-loading" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
