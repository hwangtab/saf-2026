'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/dashboard/artworks', label: '작품 관리' },
  { href: '/dashboard/profile', label: '프로필 설정' },
];

export default function DashboardNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/dashboard/artworks') {
      return pathname.startsWith('/dashboard/artworks');
    }
    return pathname === href;
  };

  return (
    <>
      <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              'inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors',
              isActive(item.href)
                ? 'border-indigo-600 text-slate-900'
                : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-slate-200 sm:hidden">
        <div className="-mb-px flex gap-4 overflow-x-auto px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'inline-flex shrink-0 items-center border-b-2 py-3 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'border-indigo-600 text-slate-900'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              )}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
