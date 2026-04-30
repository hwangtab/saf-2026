import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
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
  /** 텍스트 우측에 붙는 아이콘. lucide 컴포넌트 권장. inline 고정 */
  trailingIcon?: React.ReactNode;
  iconLayout?: IconLayout;
  iconClassName?: string;
  className?: string;
}

function toInternalHref(href: string): string | null {
  // Relative paths, hash links, and query-only links should use Next.js Link.
  if (/^(\/|#|\?|\.\/|\.\.\/)/.test(href)) {
    return href;
  }

  if (/^(mailto:|tel:)/.test(href)) {
    return null;
  }

  if (!/^https?:\/\//.test(href)) {
    return null;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) {
    return null;
  }

  try {
    const targetUrl = new URL(href);
    const siteOrigin = new URL(siteUrl).origin;
    if (targetUrl.origin !== siteOrigin) {
      return null;
    }
    return `${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`;
  } catch (error) {
    console.error('[LinkButton] Internal href conversion failed:', error);
    return null;
  }
}

export default function LinkButton({
  children,
  href,
  external = false,
  disabled = false,
  variant,
  size,
  leadingIcon,
  trailingIcon,
  iconLayout = 'inline',
  iconClassName = '',
  className = '',
}: LinkButtonProps) {
  const internalHref = toInternalHref(href);
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
      {trailingIcon && (
        <span aria-hidden="true" className={cn('ml-2 inline-flex items-center', iconClassName)}>
          {trailingIcon}
        </span>
      )}
    </>
  );

  if (disabled) {
    return (
      <span className={styles} aria-disabled="true">
        {content}
      </span>
    );
  }

  if (external || !internalHref) {
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
    <Link href={internalHref} className={styles}>
      {content}
    </Link>
  );
}
