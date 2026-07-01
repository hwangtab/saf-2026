'use client';

import clsx from 'clsx';
import { Link, usePathname } from '@/i18n/navigation';
import { useLocale } from 'next-intl';
import { OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';

type NavItem = { href: string; label: string };

const navItemsByLocale: Record<'ko' | 'en', NavItem[]> = {
  ko: [
    { href: '/dashboard/artworks', label: '작품 관리' },
    ...(OH_YOON_TERRACOTTA_EXHIBITION.active
      ? [{ href: '/dashboard/fundraiser', label: '기금마련전 출품' }]
      : []),
    { href: '/dashboard/profile', label: '프로필 설정' },
    { href: '/mypage', label: '내 주문' },
  ],
  en: [
    { href: '/dashboard/artworks', label: 'Artworks' },
    ...(OH_YOON_TERRACOTTA_EXHIBITION.active
      ? [{ href: '/dashboard/fundraiser', label: 'Fundraiser' }]
      : []),
    { href: '/dashboard/profile', label: 'Profile Settings' },
    { href: '/mypage', label: 'My Orders' },
  ],
};

export default function DashboardNav() {
  const pathname = usePathname();
  const locale = useLocale();
  const navItems = navItemsByLocale[locale as 'ko' | 'en'] ?? navItemsByLocale['ko'];

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
                ? 'border-primary-a11y text-gray-900'
                : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="border-t border-gray-200 sm:hidden">
        <div className="-mb-px flex gap-4 overflow-x-auto px-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                'inline-flex shrink-0 items-center border-b-2 py-3 text-sm font-medium transition-colors',
                isActive(item.href)
                  ? 'border-primary-a11y text-gray-900'
                  : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
