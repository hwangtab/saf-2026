import { cn } from '@/lib/utils';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { UI_STRINGS } from '@/lib/ui-strings';
import Button from '@/components/ui/Button';

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
  donateText = UI_STRINGS.CTA.DONATE_NOW,
  purchaseText = UI_STRINGS.CTA.BUY_ART,
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

  const buttonSize = variant === 'large' ? 'lg' : 'md';

  return (
    <div className={containerClasses}>
      <Button href={donateHref} external variant="accent" size={buttonSize}>
        {donateText}
      </Button>
      <Button href={purchaseHref} variant="secondary" size={buttonSize}>
        {purchaseText}
      </Button>
    </div>
  );
}
