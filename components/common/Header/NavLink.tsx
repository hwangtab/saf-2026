'use client';

import Link from 'next/link';
import clsx from 'clsx';
import type { NavigationItem } from '@/types';

interface NavLinkProps {
  item: NavigationItem;
  isActive: boolean;
  textColor?: string;
  onClick?: () => void;
  isSubItem?: boolean;
}

const baseStyles = 'relative flex items-center transition-colors';

export default function NavLink({
  item,
  isActive,
  textColor = 'text-charcoal',
  onClick,
  isSubItem = false,
}: NavLinkProps) {
  const className = clsx(
    baseStyles,
    isSubItem
      ? [
        'w-full text-sm py-2 px-3 rounded-md hover:bg-gray-50',
        isActive ? 'text-primary font-semibold bg-gray-50' : 'text-charcoal-muted hover:text-primary',
      ]
      : [
        'h-full text-sm font-medium',
        'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5 after:transition-colors',
        isActive
          ? ['text-primary font-semibold', 'after:bg-primary']
          : [textColor, 'hover:text-primary', 'after:bg-transparent hover:after:bg-primary/40'],
      ],
    textColor.includes('flex flex-col') ? textColor : '' // Allow passing custom classes via textColor prop safely
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
        <span className="block">{item.name}</span>
        {isSubItem && item.description && (
          <span className="block text-xs text-gray-400 font-normal mt-0.5">{item.description}</span>
        )}
      </a>
    );
  }

  return (
    <Link href={item.href} onClick={onClick} className={className}>
      <span className="block">{item.name}</span>
      {isSubItem && item.description && (
        <span className="block text-xs text-gray-400 font-normal mt-0.5">{item.description}</span>
      )}
    </Link>
  );
}
