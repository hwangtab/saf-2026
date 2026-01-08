import { cn } from '@/lib/utils';

/**
 * Returns appropriate classes for navigation links based on active state and variant.
 */
export function getNavLinkClasses(
  isActive: boolean,
  variant: 'desktop' | 'mobile',
  textColor?: string
): string {
  if (variant === 'desktop') {
    const baseClasses = [
      'relative flex items-center h-full text-sm font-medium transition-colors',
      'focus:outline-none focus-visible:outline-none',
      'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
      'after:transition-colors',
    ];

    if (isActive) {
      return cn(...baseClasses, 'text-primary', 'after:bg-primary');
    }
    return cn(
      ...baseClasses,
      textColor || 'text-charcoal',
      'hover:text-primary',
      'after:bg-transparent hover:after:bg-primary/40'
    );
  }

  // Mobile variant
  const mobileBase = 'block py-3 px-4 text-base rounded-lg transition-colors border-l-4';

  if (isActive) {
    return cn(mobileBase, 'text-primary font-semibold border-primary bg-primary/10');
  }
  return cn(
    mobileBase,
    'border-transparent text-charcoal',
    'hover:bg-primary/5 hover:border-primary active:bg-primary/10'
  );
}
