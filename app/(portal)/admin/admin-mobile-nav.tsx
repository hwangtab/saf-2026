'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { SignOutButton } from '@/components/auth/SignOutButton';
import { getAdminNavGroups } from './_components/admin-nav-items';

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale() as 'ko' | 'en';
  const t = useTranslations('admin.common');
  const adminNavGroups = getAdminNavGroups(locale);
  const searchParams = useSearchParams();
  const isReviewQueueMode = pathname === '/admin/users' && searchParams.get('status') === 'pending';

  // Handle ESC key to close drawer
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Handle body scroll lock
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Hamburger Button */}
      <button
        type="button"
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        onClick={() => setIsOpen(true)}
        aria-label={t('openMenu')}
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <title>{t('openMenu')}</title>
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Portal for Overlay and Drawer - renders at document.body to avoid z-index stacking context issues */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] xl:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer */}
            <nav
              id="mobile-nav-drawer"
              className="fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out xl:hidden translate-x-0"
              role="dialog"
              aria-modal="true"
              aria-label={t('adminMenu')}
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <span className="text-lg font-bold text-slate-900">SAF Admin</span>
                <button
                  type="button"
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setIsOpen(false)}
                  aria-label={t('closeMenu')}
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>{t('closeMenu')}</title>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
              <div className="flex flex-col h-full">
                <div className="p-4 flex-1 space-y-3">
                  {adminNavGroups.map((group, gi) => (
                    <div key={group.label ?? group.items.map((item) => item.href).join('|')}>
                      {gi > 0 && <div className="mb-3 border-t border-slate-100" />}
                      <div className="space-y-1">
                        {group.items.map((item) => {
                          const targetPath = item.href.split('?')[0];
                          const isReviewQueueItem = item.href.includes('status=pending');
                          const isUsersItem = item.href === '/admin/users';

                          const isActive = isReviewQueueItem
                            ? pathname === '/admin/users' && isReviewQueueMode
                            : isUsersItem
                              ? pathname === '/admin/users' && !isReviewQueueMode
                              : pathname.startsWith(targetPath);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              prefetch={
                                item.href.startsWith('/admin/changelog') ? false : undefined
                              }
                              aria-current={isActive ? 'page' : undefined}
                              className={`block rounded-md px-3 py-2 text-base font-medium transition-colors ${
                                isActive
                                  ? 'bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-600/20'
                                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                              onClick={() => setIsOpen(false)}
                            >
                              {item.label}
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-100 p-4 flex justify-center">
                  <SignOutButton />
                </div>
              </div>
            </nav>
          </>,
          document.body
        )}
    </>
  );
}
