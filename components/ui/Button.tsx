'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { m, LazyMotion, domAnimation } from 'framer-motion';
import clsx from 'clsx';

interface ButtonProps {
  children: React.ReactNode;
  href?: string;
  onClick?: () => Promise<void> | void;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'white' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  external?: boolean;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export default function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  external = false,
  loading = false,
  disabled = false,
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
      } catch (error) {
        console.error('Button click error:', error);
        // 에러는 상위 컴포넌트에서 처리하도록 전파
      } finally {
        if (isMountedRef.current) {
          setIsLoading(false);
        }
      }
    }
  };

  const baseStyles =
    'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-300 ease-out group';

  const variantStyles = {
    primary: 'bg-primary hover:bg-primary-strong text-white hover:scale-[1.02] hover:shadow-lg',
    secondary: 'bg-gray-900 hover:bg-gray-800 text-white hover:scale-[1.02] hover:shadow-lg',
    accent: 'bg-accent hover:bg-accent-strong text-light hover:scale-[1.02] hover:shadow-lg',
    outline:
      'border-2 border-gray-200 hover:border-primary hover:text-primary bg-white text-gray-700 hover:bg-white hover:scale-[1.02] hover:shadow-md',
    white:
      'bg-white border border-gray-200 text-gray-900 hover:border-primary hover:text-primary hover:scale-[1.02] hover:shadow-md',
    ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-primary',
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-2.5 text-base',
    lg: 'px-8 py-4 text-lg',
  };

  const isDisabled = disabled || loading || isLoading;

  const interactiveClasses = isDisabled
    ? 'opacity-50 cursor-not-allowed transform-none'
    : 'active:scale-[0.98] cursor-pointer';

  const styles = clsx(
    baseStyles,
    variantStyles[variant as keyof typeof variantStyles],
    sizeStyles[size],
    interactiveClasses,
    className
  );

  const content = (
    <LazyMotion features={domAnimation}>
      <>
        {(loading || isLoading) && (
          <m.div
            className="mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            aria-hidden="true"
          />
        )}
        {children}
      </>
    </LazyMotion>
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
        >
          {content}
        </a>
      );
    }

    return (
      <Link href={href} className={styles} aria-disabled={isDisabled}>
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
