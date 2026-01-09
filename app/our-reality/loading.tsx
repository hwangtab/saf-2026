import Section from '@/components/ui/Section';

export default function OurRealityLoading() {
  return (
    <>
      <div className="bg-charcoal text-white pt-32 pb-16 md:pt-40 md:pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <div className="h-12 w-48 bg-white/10 rounded mx-auto animate-pulse" />
          <div className="h-6 w-96 bg-white/10 rounded mx-auto animate-pulse" />
        </div>
      </div>

      <Section variant="white" prevVariant="canvas-soft">
        <div className="container-max max-w-3xl mx-auto space-y-6">
          <div className="h-8 w-64 bg-gray-100 rounded mx-auto animate-pulse mb-8" />
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-50 rounded animate-pulse" />
            <div className="h-4 w-5/6 bg-gray-50 rounded animate-pulse" />
            <div className="h-4 w-4/6 bg-gray-50 rounded animate-pulse" />
          </div>
        </div>
      </Section>

      <Section variant="primary-surface" prevVariant="white">
        <div className="container-max">
          <div className="mb-12 space-y-4">
            <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-6 w-96 bg-gray-200 rounded animate-pulse" />
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-start mb-16">
            <div className="bg-white p-6 rounded-lg shadow-sm h-96 animate-pulse">
              <div className="h-8 w-1/3 bg-gray-100 rounded mb-4" />
              <div className="h-64 bg-gray-50 rounded" />
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm h-96 animate-pulse">
              <div className="h-8 w-1/3 bg-gray-100 rounded mb-4" />
              <div className="h-64 bg-gray-50 rounded" />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
