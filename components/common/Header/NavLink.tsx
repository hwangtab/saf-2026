'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { NavigationItem } from '@/types';

type NavLinkVariant = 'desktop' | 'mobile';

interface NavLinkProps {
  item: NavigationItem;
  isActive: boolean;
  variant: NavLinkVariant;
  textColor?: string;
  onClick?: () => void;
}

const desktopBaseStyles = [
  'relative flex items-center h-full text-sm font-medium transition-colors',
  'focus:outline-none focus-visible:outline-none',
  'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
  'after:transition-colors',
];

const mobileBaseStyles = ['block py-3 px-4 text-base rounded-lg transition-colors border-l-4'];

export default function NavLink({
  item,
  isActive,
  variant,
  textColor = 'text-charcoal',
  onClick,
}: NavLinkProps) {
  const isDesktop = variant === 'desktop';

  const desktopClassName = clsx(
    desktopBaseStyles,
    isActive
      ? ['text-primary', 'after:bg-primary']
      : [textColor, 'hover:text-primary', 'after:bg-transparent hover:after:bg-primary/40']
  );

  const mobileClassName = clsx(
    mobileBaseStyles,
    isActive
      ? ['text-primary font-semibold border-primary bg-primary/10']
      : [
          'border-transparent text-charcoal',
          'hover:bg-primary/5 hover:border-primary active:bg-primary/10',
        ]
  );

  const className = isDesktop ? desktopClassName : mobileClassName;

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={clsx(className, !isDesktop && !isActive && 'border-transparent')}
      >
        {item.name}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={className}>
      {item.name}
    </Link>
  );
}
