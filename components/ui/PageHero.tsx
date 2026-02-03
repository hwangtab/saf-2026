import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PageHeroBackground from './PageHeroBackground';
import SawtoothDivider from './SawtoothDivider';

// ... (imports)

interface PageHeroProps {
  title: string;
  description?: string;
  children?: ReactNode;
  /** Custom background image path (e.g., "/images/artworks/1.jpg") */
  customBackgroundImage?: string;
  className?: string;
  /** Color class for the sawtooth divider (default: "text-white") */
  dividerColor?: string;
}

export default function PageHero({
  title,
  description,
  children,
  customBackgroundImage,
  className,
  dividerColor = 'text-white',
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative min-h-[60vh] flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20 overflow-hidden bg-charcoal',
        className
      )}
    >
      {/* Background Image */}
      <PageHeroBackground customImage={customBackgroundImage} />
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
      <SawtoothDivider position="bottom" colorClass={dividerColor} />
    </section>
  );
}
