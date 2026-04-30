'use client';

import { useState, useRef, useEffect } from 'react';
import { Link } from '@/i18n/navigation';
import { cn } from '@/lib/utils/cn';
import {
  buttonVariants,
  FIXED_LEFT_ICON_OFFSET,
  type ButtonSize,
  type ButtonStyleProps,
  type IconLayout,
} from './button-base';

interface ButtonProps extends ButtonStyleProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => Promise<void> | void;
  external?: boolean;
  loading?: boolean;
  disabled?: boolean;
  leadingIcon?: React.ReactNode;
  /** 텍스트 우측에 붙는 아이콘. lucide 컴포넌트 권장. fixed-left layout과 무관하게 inline */
  trailingIcon?: React.ReactNode;
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
  trailingIcon,
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
  const isInlineBusy = isBusy && !isFixedLeftLayout;
  const iconOffsetClass = FIXED_LEFT_ICON_OFFSET[resolvedSize];

  const styles = cn(
    buttonVariants({ variant, size }),
    interactiveClasses,
    (isFixedLeftLayout || isInlineBusy) && 'relative',
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
        // animate-spin이 transform: rotate를 강제 설정하면서 같은 노드의
        // -translate-x-1/2 / -translate-y-1/2를 덮어쓰는 문제 회피 →
        // 외곽 div(위치 transform)와 내부 div(회전 animation) 분리
        <div
          className={cn(
            'absolute top-1/2 -translate-y-1/2 pointer-events-none',
            isFixedLeftLayout ? iconOffsetClass : 'left-1/2 -translate-x-1/2'
          )}
          aria-hidden="true"
        >
          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
        </div>
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
      <span className={cn(isInlineBusy && 'invisible')}>{children}</span>
      {trailingIcon && !isBusy && (
        <span aria-hidden="true" className={cn('ml-2 inline-flex items-center', iconClassName)}>
          {trailingIcon}
        </span>
      )}
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
