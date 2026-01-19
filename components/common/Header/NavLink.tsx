'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { NavigationItem } from '@/types';

interface NavLinkProps {
  item: NavigationItem;
  isActive: boolean;
  textColor?: string;
  onClick?: () => void;
}

const baseStyles = [
  'relative flex items-center h-full text-sm font-medium transition-colors',
  'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
  'after:transition-colors',
];

export default function NavLink({
  item,
  isActive,
  textColor = 'text-charcoal',
  onClick,
}: NavLinkProps) {
  const className = clsx(
    baseStyles,
    isActive
      ? ['text-primary font-semibold', 'after:bg-primary']
      : [textColor, 'hover:text-primary', 'after:bg-transparent hover:after:bg-primary/40']
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
        className={className}
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
