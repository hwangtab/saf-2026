import type { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  description: string;
  backgroundGradient?: string;
  children?: ReactNode;
}

export default function PageHero({
  title,
  description,
  backgroundGradient = 'from-gray-50 to-gray-100',
  children,
}: PageHeroProps) {
  return (
    <section className={`py-12 md:py-20 bg-gradient-to-br ${backgroundGradient}`}>
      <div className="container-max text-center">
        <h1
          className="font-partial text-4xl md:text-5xl mb-6 tracking-tight text-balance"
          style={{
            fontFamily:
              'PartialSans, GMarketSans, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          {title}
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">{description}</p>
        {children ? <div className="mt-8 flex justify-center">{children}</div> : null}
      </div>
    </section>
  );
}
