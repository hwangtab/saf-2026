'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

type ButtonSize = 'xs' | 'sm' | 'md' | 'lg';
type IconLayout = 'inline' | 'fixed-left';

const FIXED_LEFT_ICON_OFFSET: Record<ButtonSize, string> = {
  xs: 'left-3',
  sm: 'left-4',
  md: 'left-6',
  lg: 'left-8',
};

export const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-300 ease-out group',
  {
    variants: {
      variant: {
        primary: 'bg-primary hover:bg-primary-strong text-white hover:scale-[1.02] hover:shadow-lg',
        secondary: 'bg-gray-900 hover:bg-gray-800 text-white hover:scale-[1.02] hover:shadow-lg',
        accent: 'bg-accent hover:bg-accent-strong text-white hover:scale-[1.02] hover:shadow-lg',
        outline:
          'border-2 border-gray-200 hover:border-primary hover:text-primary bg-white text-gray-700 hover:bg-white hover:scale-[1.02] hover:shadow-md',
        'outline-white':
          'border-2 border-white/50 text-white bg-transparent hover:bg-white hover:text-gray-900 hover:border-white hover:scale-[1.02] hover:shadow-md',
        white:
          'bg-white border border-gray-200 text-gray-900 hover:border-primary hover:text-primary hover:scale-[1.02] hover:shadow-md',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-primary',
        'ghost-white': 'bg-transparent text-white/90 hover:bg-white/10 hover:text-white',
      },
      size: {
        xs: 'px-3 py-1.5 text-sm min-h-[36px]',
        sm: 'px-4 py-2 text-sm min-h-[44px]',
        md: 'px-6 py-2.5 text-base min-h-[44px]',
        lg: 'px-8 py-4 text-lg min-h-[52px]',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

interface ButtonProps extends VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
  href?: string;
  onClick?: () => Promise<void> | void;
  external?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  iconLayout?: IconLayout;
  iconClassName?: string;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  href,
  onClick,
  variant,
  size,
  external = false,
  loading = false,
  disabled = false,
  leadingIcon,
  iconLayout = 'inline',
  iconClassName = '',
  className = '',
  type = 'button',
}: ButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const handleClick = async () => {
    if (onClick && !isLoading && !disabled && !loading) {
      setIsLoading(true);
      try {
        await onClick();
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }
  };

  const isDisabled = disabled || loading || isLoading;

  const interactiveClasses = isDisabled
    ? 'opacity-50 cursor-not-allowed transform-none'
    : 'active:scale-[0.98] cursor-pointer';

  const resolvedSize = (size ?? 'md') as ButtonSize;
  const isBusy = loading || isLoading;
  const hasLeadingIcon = Boolean(leadingIcon);
  const isFixedLeftLayout = iconLayout === 'fixed-left' && (hasLeadingIcon || isBusy);
  const iconOffsetClass = FIXED_LEFT_ICON_OFFSET[resolvedSize];

  const styles = cn(
    buttonVariants({ variant, size }),
    interactiveClasses,
    isFixedLeftLayout && 'relative',
    className
  );

  const handleLinkClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isDisabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (onClick) {
      void handleClick();
    }
  };

  const content = (
    <>
      {isBusy && (
        <m.div
          className={cn(
            'h-4 w-4 border-2 border-white border-t-transparent rounded-full',
            isFixedLeftLayout
              ? `absolute ${iconOffsetClass} top-1/2 -translate-y-1/2 pointer-events-none`
              : 'mr-2'
          )}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          aria-hidden="true"
        />
      )}
      {hasLeadingIcon && !isBusy && (
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

  if (href) {
    if (external) {
      return (
        <a
          href={href}
          className={styles}
          target="_blank"
          rel="noopener noreferrer"
          aria-disabled={isDisabled}
          tabIndex={isDisabled ? -1 : undefined}
          onClick={handleLinkClick}
        >
          {content}
        </a>
      );
    }

    return (
      <Link
        href={href}
        className={styles}
        aria-disabled={isDisabled}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={handleLinkClick}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type={type} onClick={handleClick} disabled={isDisabled} className={styles}>
      {content}
    </button>
  );
}
