import type { ReactNode } from 'react';

interface PageHeroProps {
  title: string;
  description: string;
  backgroundClass?: string;
  children?: ReactNode;
}

export default function PageHero({
  title,
  description,
  backgroundClass = 'bg-canvas-soft',
  children,
}: PageHeroProps) {
  return (
    <section className={`py-12 md:py-20 ${backgroundClass}`}>
      <div className="container-max text-center">
        <h1
          className="font-partial text-5xl md:text-6xl mb-6 tracking-tight text-balance"
          style={{
            fontFamily:
              'PartialSans, GMarketSans, -apple-system, BlinkMacSystemFont, system-ui, sans-serif',
          }}
        >
          {title}
        </h1>
        <p className="text-lg text-charcoal-muted max-w-2xl mx-auto text-balance">{description}</p>
        {children ? <div className="mt-8 flex justify-center">{children}</div> : null}
      </div>
    </section>
  );
}
