import { ReactNode } from 'react';

interface SectionTitleProps {
  children: ReactNode;
  className?: string; // Additional classes if needed (e.g., mb-8, text-center)
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
  id?: string;
}

/**
 * A standardized section title component that ensures consistent typography and line wrapping.
 * Applies 'font-section', 'font-normal', responsive sizes, and 'text-balance'.
 */
export default function SectionTitle({
  children,
  className = '',
  as: Component = 'h2',
  id,
}: SectionTitleProps) {
  return (
    <Component id={id} className={`text-section-title text-balance text-center ${className}`}>
      {children}
    </Component>
  );
}
