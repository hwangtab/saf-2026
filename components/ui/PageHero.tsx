import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import PageHeroBackground from './PageHeroBackground';
import SawtoothDivider from './SawtoothDivider';
import Breadcrumb from './Breadcrumb';
import type { BreadcrumbItem } from '@/types';

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
  id?: string;
  descriptionId?: string;
  breadcrumbItems?: BreadcrumbItem[];
}

export default function PageHero({
  title,
  description,
  children,
  customBackgroundImage,
  className,
  dividerColor = 'text-white',
  id,
  descriptionId,
  breadcrumbItems,
}: PageHeroProps) {
  return (
    <section
      className={cn(
        'relative min-h-[60vh] flex items-center justify-center pt-12 pb-12 md:pt-20 md:pb-20 overflow-hidden bg-charcoal',
        className
      )}
    >
      <div
        data-hero-sentinel="true"
        aria-hidden="true"
        className="absolute top-0 left-0 h-px w-px"
      />
      {/* Background Image */}
      <PageHeroBackground customImage={customBackgroundImage} seed={id || title} />
      {/* Dark Overlay */}
      <div className="absolute inset-0 bg-black/60 z-10" />

      {/* Content */}
      <div className="relative z-10 container-max text-center w-full">
        {breadcrumbItems && breadcrumbItems.length >= 2 && (
          <div className="flex justify-center mb-4">
            <Breadcrumb items={breadcrumbItems} />
          </div>
        )}
        <h1
          id={id}
          className="font-display text-5xl md:text-6xl lg:text-7xl mb-6 leading-tight text-white drop-shadow-lg break-keep text-balance"
        >
          {title}
        </h1>
        {description && (
          <p
            id={descriptionId}
            className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto leading-relaxed drop-shadow-lg text-balance"
          >
            {description}
          </p>
        )}
        {children && <div className="mt-8 flex justify-center">{children}</div>}
      </div>
      <SawtoothDivider position="bottom" colorClass={dividerColor} />
    </section>
  );
}
