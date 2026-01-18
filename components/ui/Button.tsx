'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { m } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

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
        white:
          'bg-white border border-gray-200 text-gray-900 hover:border-primary hover:text-primary hover:scale-[1.02] hover:shadow-md',
        ghost: 'bg-transparent hover:bg-gray-100 text-gray-700 hover:text-primary',
      },
      size: {
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

  const styles = cn(buttonVariants({ variant, size }), interactiveClasses, className);

  const content = (
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
