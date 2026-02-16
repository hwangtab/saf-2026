'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignOutButton } from '@/components/auth/SignOutButton';

const navItems = [
  { href: '/admin/dashboard', label: '대시보드' },
  { href: '/admin/revenue', label: '매출 현황' },
  { href: '/admin/users', label: '사용자 관리' },
  { href: '/admin/content', label: '콘텐츠 관리' },
  { href: '/admin/artists', label: '작가 관리' },
  { href: '/admin/artworks', label: '작품 관리' },
  { href: '/admin/logs', label: '활동 로그' },
  { href: '/admin/trash', label: '휴지통' },
];

export function AdminMobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

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
        className="inline-flex items-center justify-center rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700 sm:hidden"
        onClick={() => setIsOpen(true)}
        aria-label="메뉴 열기"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-drawer"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
              className="fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[1px] sm:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer */}
            <nav
              id="mobile-nav-drawer"
              className="fixed top-0 left-0 h-full w-64 bg-white z-50 transform transition-transform duration-300 ease-in-out sm:hidden translate-x-0"
              role="dialog"
              aria-modal="true"
              aria-label="관리자 메뉴"
            >
              <div className="flex items-center justify-between border-b border-slate-100 p-4">
                <span className="text-lg font-bold text-slate-900">SAF Admin</span>
                <button
                  type="button"
                  className="rounded-md p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  onClick={() => setIsOpen(false)}
                  aria-label="메뉴 닫기"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                <div className="space-y-1 p-4 flex-1">
                  {navItems.map((item) => {
                    const isActive = pathname.startsWith(item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
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
