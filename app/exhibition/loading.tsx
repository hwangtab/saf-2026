import Section from '@/components/ui/Section';

export default function ExhibitionLoading() {
  return (
    <>
      <div className="bg-charcoal text-white pt-32 pb-16 md:pt-40 md:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-12 w-48 bg-white/10 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-8" />

          <div className="mb-12">
            <div className="aspect-[1200/1700] w-full max-w-4xl bg-gray-200 rounded-2xl animate-pulse" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="space-y-8">
              <div className="space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="pl-4 border-l-4 border-gray-200">
                    <div className="h-4 w-16 bg-gray-200 rounded mb-2" />
                    <div className="h-6 w-48 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-8">
                <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
                <div className="h-12 w-full bg-gray-200 rounded animate-pulse" />
              </div>
            </div>

            <div className="h-[400px] bg-gray-200 rounded-lg animate-pulse" />
          </div>
        </div>
      </Section>
    </>
  );
}
