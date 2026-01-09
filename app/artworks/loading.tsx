import Section from '@/components/ui/Section';

export default function ArtworksLoading() {
  return (
    <main className="min-h-screen">
      <div className="bg-charcoal text-white pt-32 pb-16 md:pt-40 md:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-12 w-48 bg-white/10 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <Section variant="primary-surface" prevVariant="white" padding="none" className="pt-4 pb-12">
        <div className="container-max py-8 space-y-8">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
            <div className="h-10 w-full md:w-64 rounded shimmer-loading" />
            <div className="h-10 w-full md:w-48 rounded shimmer-loading" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-sm overflow-hidden h-full">
                <div className="aspect-[4/5] shimmer-loading" />
                <div className="p-4 space-y-3">
                  <div className="h-6 w-3/4 rounded shimmer-loading" />
                  <div className="h-4 w-1/2 rounded shimmer-loading" />
                  <div className="h-4 w-full rounded shimmer-loading" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </main>
  );
}
