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
          <div className="h-8 w-64 bg-gray-200 rounded animate-pulse mb-12" />
          <div className="bg-white rounded-lg shadow-sm p-8 mb-12 animate-pulse">
            <div className="h-6 w-48 bg-gray-100 rounded mb-8" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="flex flex-col items-center gap-2">
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-12 bg-gray-100 rounded" />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <div className="h-4 w-full bg-gray-50 rounded" />
              <div className="h-4 w-5/6 bg-gray-50 rounded" />
            </div>
          </div>
        </div>
      </Section>

      <Section variant="gray" prevVariant="sun-soft">
        <div className="container-max">
          <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-12" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden animate-pulse">
                <div className="aspect-square bg-gray-200" />
                <div className="p-6 space-y-3">
                  <div className="h-6 w-3/4 bg-gray-100 rounded" />
                  <div className="h-4 w-1/2 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </Section>
    </>
  );
}
