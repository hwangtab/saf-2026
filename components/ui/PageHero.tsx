import { ReactNode } from 'react';
import PageHeroBackground from './PageHeroBackground';

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
}

export default function PageHero({ title, description, children }: PageHeroProps) {
  return (
    <section className="relative min-h-[60vh] flex items-center justify-center py-12 md:py-20 overflow-hidden bg-charcoal">
      {/* Background Image */}
      <PageHeroBackground />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Content */}
      <div className="relative z-10 container-max text-center w-full">
        <h1 className="font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg break-keep text-balance">
          {title}
        </h1>
        {description && (
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance">
            {description}
          </p>
        )}
        {children && <div className="mt-8 flex justify-center">{children}</div>}
      </div>
    </section>
  );
}
