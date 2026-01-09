import Section from '@/components/ui/Section';

export default function OurProofLoading() {
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
          <div className="max-w-3xl mx-auto text-center mb-12">
            <div className="h-10 w-64 mx-auto rounded shimmer-loading mb-8" />
            <div className="h-20 w-full rounded shimmer-loading" />
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className="bg-white p-8 rounded-lg shadow text-center border-t-4 border-gray-200"
              >
                <div className="h-10 w-24 mx-auto rounded shimmer-loading mb-2" />
                <div className="h-6 w-32 mx-auto rounded shimmer-loading" />
              </div>
            ))}
          </div>

          <div className="mt-12 bg-white p-8 rounded-lg max-w-3xl mx-auto border-l-4 border-gray-200">
            <div className="h-6 w-3/4 rounded shimmer-loading mb-2" />
            <div className="h-4 w-full rounded shimmer-loading mb-6" />
            <div className="h-8 w-1/2 rounded shimmer-loading" />
          </div>
        </div>
      </Section>

      <Section variant="white" prevVariant="primary-surface">
        <div className="container-max">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="space-y-4">
              <div className="h-8 w-48 rounded shimmer-loading mb-6" />
              <div className="h-4 w-full rounded shimmer-loading" />
              <div className="h-4 w-full rounded shimmer-loading" />
              <div className="h-4 w-3/4 rounded shimmer-loading" />
            </div>
            <div className="bg-gray-50 rounded-lg p-8 h-64 shimmer-loading" />
          </div>
        </div>
      </Section>
    </>
  );
}
