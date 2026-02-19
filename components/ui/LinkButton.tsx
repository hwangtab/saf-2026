import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  buttonVariants,
  FIXED_LEFT_ICON_OFFSET,
  type ButtonSize,
  type ButtonStyleProps,
  type IconLayout,
} from './button-base';

interface LinkButtonProps extends ButtonStyleProps {
  children: React.ReactNode;
  href: string;
  external?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  iconLayout?: IconLayout;
  iconClassName?: string;
  className?: string;
}

function shouldUseAnchor(href: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/.test(href);
}

export default function LinkButton({
  children,
  href,
  external = false,
  disabled = false,
  variant,
  size,
  leadingIcon,
  iconLayout = 'inline',
  iconClassName = '',
  className = '',
}: LinkButtonProps) {
  const resolvedSize = (size ?? 'md') as ButtonSize;
  const hasLeadingIcon = Boolean(leadingIcon);
  const isFixedLeftLayout = iconLayout === 'fixed-left' && hasLeadingIcon;
  const iconOffsetClass = FIXED_LEFT_ICON_OFFSET[resolvedSize];

  const interactiveClasses = disabled
    ? 'opacity-50 cursor-not-allowed pointer-events-none transform-none'
    : 'active:scale-[0.98] cursor-pointer';

  const styles = cn(
    buttonVariants({ variant, size }),
    interactiveClasses,
    isFixedLeftLayout && 'relative',
    className
  );

  const content = (
    <>
      {hasLeadingIcon && (
        <span
          aria-hidden="true"
          className={cn(
            isFixedLeftLayout
              ? `absolute ${iconOffsetClass} top-1/2 -translate-y-1/2 pointer-events-none`
              : 'mr-2 inline-flex items-center',
            iconClassName
          )}
        >
          {leadingIcon}
        </span>
      )}
      {children}
    </>
  );

  if (disabled) {
    return (
      <span className={styles} aria-disabled="true">
        {content}
      </span>
    );
  }

  if (external || shouldUseAnchor(href)) {
    return (
      <a
        href={href}
        className={styles}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={styles}>
      {content}
    </Link>
  );
}
