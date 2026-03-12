'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { AdminNavItem } from './admin-nav-items';

interface NavDropdownProps {
  label: string;
  items: AdminNavItem[];
}

function isItemActive(item: AdminNavItem, pathname: string, isReviewQueueMode: boolean): boolean {
  const isReviewQueueItem = item.href.includes('status=pending');
  const isUsersItem = item.href === '/admin/users';

  if (isReviewQueueItem) return isReviewQueueMode;
  if (isUsersItem) return pathname === '/admin/users' && !isReviewQueueMode;

  const targetPath = item.href.split('?')[0];
  return pathname.startsWith(targetPath);
}

export function NavDropdown({ label, items }: NavDropdownProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isReviewQueueMode = pathname === '/admin/users' && searchParams.get('status') === 'pending';

  const isGroupActive = items.some((item) => isItemActive(item, pathname, isReviewQueueMode));

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (!open) return;
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pt-1 text-sm font-medium transition-colors ${
          isGroupActive
            ? 'border-indigo-500 text-indigo-700'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        {label}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          {items.map((item) => {
            const isActive = isItemActive(item, pathname, isReviewQueueMode);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-indigo-50 font-medium text-indigo-700'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
