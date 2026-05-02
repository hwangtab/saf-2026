import { getTranslations } from 'next-intl/server';
import { cn } from '@/lib/utils/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'subtle' | 'white';
  className?: string;
}

const sizeClasses = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-10 w-10 border-[3px]',
};

const variantClasses = {
  default: 'border-charcoal/20 border-t-primary',
  subtle: 'border-gray-200 border-t-gray-500',
  white: 'border-white/30 border-t-white',
};

export default async function Spinner({
  size = 'md',
  variant = 'default',
  className,
}: SpinnerProps) {
  const t = await getTranslations('a11y');
  return (
    <div
      role="status"
      aria-label={t('loading')}
      className={cn(
        'animate-spin rounded-full',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    />
  );
}
