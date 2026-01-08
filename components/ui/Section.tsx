import { cn } from '@/lib/utils';
import type { ReactNode } from 'react';

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

interface SectionProps {
  children: ReactNode;
  variant?: SectionVariant;
  prevVariant?: SectionVariant;
  padding?: 'default' | 'none' | 'sm';
  className?: string;
  id?: string;
}

const variantStyles: Record<SectionVariant, string> = {
  white: 'bg-white',
  gray: 'bg-gray-50',
  canvas: 'bg-canvas',
  'canvas-soft': 'bg-canvas-soft',
  primary: 'bg-primary',
  'primary-soft': 'bg-primary-soft',
  'primary-surface': 'bg-primary-surface',
  accent: 'bg-accent',
  'accent-soft': 'bg-accent-soft',
  sun: 'bg-sun',
  'sun-soft': 'bg-sun-soft',
  red: 'bg-red-100',
};

// Maps variants to their "from-" gradient class
const gradientFromStyles: Record<SectionVariant, string> = {
  white: 'from-white',
  gray: 'from-gray-50',
  canvas: 'from-canvas',
  'canvas-soft': 'from-canvas-soft',
  primary: 'from-primary',
  'primary-soft': 'from-primary-soft',
  'primary-surface': 'from-primary-surface',
  accent: 'from-accent',
  'accent-soft': 'from-accent-soft',
  sun: 'from-sun',
  'sun-soft': 'from-sun-soft',
  red: 'from-red-100',
};

// Maps variants to their "to-" gradient class
const gradientToStyles: Record<SectionVariant, string> = {
  white: 'to-white',
  gray: 'to-gray-50',
  canvas: 'to-canvas',
  'canvas-soft': 'to-canvas-soft',
  primary: 'to-primary',
  'primary-soft': 'to-primary-soft',
  'primary-surface': 'to-primary-surface',
  accent: 'to-accent',
  'accent-soft': 'to-accent-soft',
  sun: 'to-sun',
  'sun-soft': 'to-sun-soft',
  red: 'to-red-100',
};

export default function Section({
  children,
  variant = 'white',
  prevVariant,
  padding = 'default',
  className,
  id,
}: SectionProps) {
  let backgroundClass = variantStyles[variant];

  // If prevVariant is provided and different from current, apply gradient
  if (prevVariant && prevVariant !== variant) {
    backgroundClass = cn(
      'bg-gradient-to-b',
      gradientFromStyles[prevVariant],
      gradientToStyles[variant]
    );
  }

  const paddingClass =
    padding === 'default' ? 'py-12 md:py-20' : padding === 'sm' ? 'py-8 md:py-12' : '';

  return (
    <section id={id} className={cn(backgroundClass, paddingClass, className)}>
      {children}
    </section>
  );
}
