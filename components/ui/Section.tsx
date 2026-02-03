import { cn } from '@/lib/utils';
import { ReactNode, forwardRef } from 'react';

export type SectionVariant =
  | 'white'
  | 'gray'
  | 'canvas'
  | 'canvas-soft'
  | 'primary'
  | 'primary-soft'
  | 'primary-surface'
  | 'accent'
  | 'accent-soft'
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
  accent: { bg: 'bg-accent', from: 'from-accent', to: 'to-accent' },
  'accent-soft': { bg: 'bg-accent-soft', from: 'from-accent-soft', to: 'to-accent-soft' },
  sun: { bg: 'bg-sun', from: 'from-sun', to: 'to-sun' },
  'sun-soft': { bg: 'bg-sun-soft', from: 'from-sun-soft', to: 'to-sun-soft' },
  red: { bg: 'bg-red-100', from: 'from-red-100', to: 'to-red-100' },
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
