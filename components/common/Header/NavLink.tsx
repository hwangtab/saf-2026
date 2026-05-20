'use client';

import { Link } from '@/i18n/navigation';
import clsx from 'clsx';
import type { NavigationItem } from '@/types';

interface NavLinkProps {
  item: NavigationItem;
  isActive: boolean;
  textColor?: string;
  onClick?: () => void;
  isSubItem?: boolean;
}

const baseStyles = 'relative flex transition-colors';

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
          'w-full text-sm py-2 px-3 rounded-md hover:bg-gray-50 items-start text-left',
          isActive
            ? 'text-primary-strong font-semibold bg-gray-50'
            : 'text-charcoal-muted hover:text-primary-strong',
        ]
      : [
          'h-full text-xs xl:text-sm font-medium items-center whitespace-nowrap',
          'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5 after:transition-colors',
          isActive
            ? ['text-primary-strong font-semibold', 'after:bg-primary']
            : [
                textColor,
                'hover:text-primary-strong',
                'after:bg-transparent hover:after:bg-primary/40',
              ],
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
          <span className="block text-xs text-charcoal-soft font-normal mt-0.5 whitespace-normal">
            {item.description}
          </span>
        )}
      </a>
    );
  }

  return (
    // Chrome navigation Link — viewport에 항상 들어와 매 페이지 RSC prefetch fire.
    // PSI mobile audit에서 12개 prefetch가 308KB. nav item당 ~20-30KB 절감.
    // 사용자 클릭 시 100~300ms 지연이 더 큰 LCP/네트워크 이득.
    // (카드 5 — RSC prefetch 308KB 축소)
    <Link href={item.href} onClick={onClick} className={className} prefetch={false}>
      <span className="block">{item.name}</span>
      {isSubItem && item.description && (
        <span className="block text-xs text-charcoal-soft font-normal mt-0.5 whitespace-normal">
          {item.description}
        </span>
      )}
    </Link>
  );
}
