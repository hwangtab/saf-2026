'use client';

import { useState } from 'react';
import clsx from 'clsx';
import type { NavigationItem } from '@/types';
import NavLink from './NavLink';

interface DesktopNavItemProps {
  item: NavigationItem;
  isActive: (href: string) => boolean;
  textColor: string;
}

export default function DesktopNavItem({ item, isActive, textColor }: DesktopNavItemProps) {
  const [dismissed, setDismissed] = useState(false);

  const handleDismiss = () => {
    setDismissed(true);
    (document.activeElement as HTMLElement | null)?.blur();
  };

  return (
    <>
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <li
        className="h-full flex items-center group relative"
        onMouseLeave={() => setDismissed(false)}
      >
        <div className="relative h-full flex items-center">
          <NavLink
            item={item}
            isActive={isActive(item.href)}
            textColor={textColor}
            onClick={handleDismiss}
          />

          {item.items && item.items.length > 0 && (
            <div
              className={clsx(
                'absolute top-full left-0 pt-2 min-w-[240px] z-50',
                'transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
                "before:absolute before:h-4 before:w-full before:-top-4 before:left-0 before:content-['']",
                dismissed
                  ? 'opacity-0 translate-y-2 invisible pointer-events-none'
                  : 'opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible group-focus-within:opacity-100 group-focus-within:translate-y-0 group-focus-within:visible'
              )}
            >
              <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-2 overflow-hidden">
                <ul className="flex flex-col gap-1">
                  {item.items.map((subItem) => (
                    <li key={subItem.href}>
                      <NavLink
                        item={subItem}
                        isActive={isActive(subItem.href)}
                        textColor="text-charcoal hover:bg-gray-50 flex flex-col items-start text-left p-3 rounded-md transition-colors"
                        isSubItem
                        onClick={handleDismiss}
                      />
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </li>
    </>
  );
}
