import { cn } from '@/lib/utils';
import { EXTERNAL_LINKS } from '@/lib/constants';

interface CTAButtonGroupProps {
  donateText?: string;
  purchaseText?: string;
  donateHref?: string;
  purchaseHref?: string;
  variant?: 'default' | 'large';
  className?: string;
  vertical?: boolean;
}

/**
 * CTA Button Group - Donate & Purchase buttons
 *
 * Standardized component for displaying call-to-action buttons
 * for donations and artwork purchases across different pages.
 *
 * @example
 * ```tsx
 * <CTAButtonGroup />
 * <CTAButtonGroup variant="large" />
 * <CTAButtonGroup vertical className="max-w-md" />
 * ```
 */
export default function CTAButtonGroup({
  donateText = '❤️ 지금 후원하기',
  purchaseText = '🎨 작품 구매하기',
  donateHref = EXTERNAL_LINKS.DONATE,
  purchaseHref = '/artworks',
  variant = 'default',
  className,
  vertical = false,
}: CTAButtonGroupProps) {
  const containerClasses = cn(
    'flex gap-4',
    vertical ? 'flex-col' : 'flex-col sm:flex-row',
    className
  );

  const buttonBaseClasses =
    'inline-flex items-center justify-center font-bold rounded-lg transition-colors';

  const sizeClasses = {
    default: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg',
  };

  const donateClasses = cn(
    buttonBaseClasses,
    sizeClasses[variant],
    'bg-accent hover:bg-accent-strong text-light'
  );

  const purchaseClasses = cn(
    buttonBaseClasses,
    sizeClasses[variant],
    'bg-gray-900 hover:bg-gray-800 text-white'
  );

  return (
    <div className={containerClasses}>
      <a href={donateHref} target="_blank" rel="noopener noreferrer" className={donateClasses}>
        {donateText}
      </a>
      <a href={purchaseHref} className={purchaseClasses}>
        {purchaseText}
      </a>
    </div>
  );
}
