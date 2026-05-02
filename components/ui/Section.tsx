import { cn } from '@/lib/utils/cn';
import { ReactNode, forwardRef } from 'react';

export type SectionVariant =
  | 'white'
  | 'gray'
  | 'canvas'
  | 'canvas-soft'
  | 'primary'
  | 'primary-soft'
  | 'primary-surface'
  | 'sun'
  | 'sun-soft'
  | 'red';

export interface SectionProps {
  children: ReactNode;
  variant?: SectionVariant;
  prevVariant?: SectionVariant;
  padding?: 'default' | 'none' | 'sm';
  className?: string;
  id?: string;
}

interface VariantStyle {
  bg: string;
  from: string;
  to: string;
}

const SECTION_STYLES: Record<SectionVariant, VariantStyle> = {
  white: { bg: 'bg-white', from: 'from-white', to: 'to-white' },
  gray: { bg: 'bg-gray-50', from: 'from-gray-50', to: 'to-gray-50' },
  canvas: { bg: 'bg-canvas', from: 'from-canvas', to: 'to-canvas' },
  'canvas-soft': { bg: 'bg-canvas-soft', from: 'from-canvas-soft', to: 'to-canvas-soft' },
  primary: { bg: 'bg-primary', from: 'from-primary', to: 'to-primary' },
  'primary-soft': { bg: 'bg-primary-soft', from: 'from-primary-soft', to: 'to-primary-soft' },
  'primary-surface': {
    bg: 'bg-primary-surface',
    from: 'from-primary-surface',
    to: 'to-primary-surface',
  },
  sun: { bg: 'bg-charcoal-deep', from: 'from-charcoal-deep', to: 'to-charcoal-deep' },
  'sun-soft': { bg: 'bg-canvas', from: 'from-canvas', to: 'to-canvas' },
  red: { bg: 'bg-danger/20', from: 'from-danger/20', to: 'to-danger/20' },
};

const Section = forwardRef<HTMLElement, SectionProps>(
  ({ children, variant = 'white', prevVariant, padding = 'default', className, id }, ref) => {
    let backgroundClass = SECTION_STYLES[variant].bg;

    if (prevVariant && prevVariant !== variant) {
      backgroundClass = cn(
        'bg-gradient-to-b',
        SECTION_STYLES[prevVariant].from,
        SECTION_STYLES[variant].to
      );
    }

    const paddingClass =
      padding === 'default' ? 'py-12 md:py-20' : padding === 'sm' ? 'py-8 md:py-12' : '';

    return (
      <section id={id} ref={ref} className={cn(backgroundClass, paddingClass, className)}>
        {children}
      </section>
    );
  }
);

Section.displayName = 'Section';

export default Section;
