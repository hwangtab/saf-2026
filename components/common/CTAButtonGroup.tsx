'use client';

import { cn } from '@/lib/utils';
import { EXTERNAL_LINKS } from '@/lib/constants';
import { useLocale } from 'next-intl';
import { getUIStrings } from '@/lib/ui-strings';
import LinkButton from '@/components/ui/LinkButton';

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
  donateText,
  purchaseText,
  donateHref = EXTERNAL_LINKS.JOIN_MEMBER,
  purchaseHref = '/artworks',
  variant = 'default',
  className,
  vertical = false,
}: CTAButtonGroupProps) {
  const ui = getUIStrings(useLocale());
  const resolvedDonateText = donateText ?? ui.CTA.DONATE_NOW;
  const resolvedPurchaseText = purchaseText ?? ui.CTA.BUY_ART;

  const containerClasses = cn(
    'flex gap-4',
    vertical ? 'flex-col' : 'flex-col sm:flex-row',
    className
  );

  const buttonSize = variant === 'large' ? 'lg' : 'md';
  const isDonateExternal = donateHref?.startsWith('http');
  const isPurchaseExternal = purchaseHref?.startsWith('http');

  return (
    <div className={containerClasses}>
      <LinkButton href={donateHref} external={isDonateExternal} variant="accent" size={buttonSize}>
        {resolvedDonateText}
      </LinkButton>
      <LinkButton
        href={purchaseHref}
        external={isPurchaseExternal}
        variant="secondary"
        size={buttonSize}
      >
        {resolvedPurchaseText}
      </LinkButton>
    </div>
  );
}
