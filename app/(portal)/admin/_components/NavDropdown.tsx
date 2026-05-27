'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import type { AdminNavItem } from './admin-nav-items';

interface NavDropdownProps {
  label: string;
  items: AdminNavItem[];
  /**
   * 그룹 옆 alert dot 표시 — Web Vitals 회귀 감지에서 사용 ("분석" 그룹).
   * 0보다 크면 작은 빨간 점 + 카운트 tooltip. 드롭다운 닫혀 있어도 즉시 인지.
   */
  alertCount?: number;
}

function isItemActive(
  item: AdminNavItem,
  pathname: string,
  isReviewQueueMode: boolean,
  roleFilter: string | null
): boolean {
  const isReviewQueueItem = item.href.includes('status=pending');
  const isCustomersItem = item.href.includes('role=user');
  const isUsersItem = item.href === '/admin/users';

  if (isReviewQueueItem) return isReviewQueueMode;
  if (isCustomersItem)
    return pathname === '/admin/users' && !isReviewQueueMode && roleFilter === 'user';
  if (isUsersItem)
    return pathname === '/admin/users' && !isReviewQueueMode && roleFilter !== 'user';

  const targetPath = item.href.split('?')[0];
  return pathname.startsWith(targetPath);
}

export function NavDropdown({ label, items, alertCount = 0 }: NavDropdownProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isReviewQueueMode = pathname === '/admin/users' && searchParams.get('status') === 'pending';
  const roleFilter = pathname === '/admin/users' ? searchParams.get('role') : null;

  const isGroupActive = items.some((item) =>
    isItemActive(item, pathname, isReviewQueueMode, roleFilter)
  );

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
        className={`inline-flex items-center gap-1 whitespace-nowrap border-b-2 px-1 pt-1 pb-2 text-sm font-medium transition-colors ${
          isGroupActive
            ? 'border-primary-a11y text-primary-strong'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        {label}
        {alertCount > 0 && (
          <span
            className="ml-0.5 inline-flex h-2 w-2 rounded-full bg-danger-a11y"
            title={`Web Vitals 회귀 ${alertCount}건`}
            aria-label={`Web Vitals 회귀 ${alertCount}건`}
          />
        )}
        <svg
          className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <title>{label}</title>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 min-w-[160px] rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5">
          {items.map((item) => {
            const isActive = isItemActive(item, pathname, isReviewQueueMode, roleFilter);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={item.href.startsWith('/admin/changelog') ? false : undefined}
                onClick={() => setOpen(false)}
                className={`block px-4 py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-primary-surface font-medium text-primary-strong'
                    : 'text-gray-700 hover:bg-gray-50'
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
