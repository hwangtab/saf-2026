'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { useTranslations, useLocale } from 'next-intl';
import { SignOutButton } from '@/components/auth/SignOutButton';
import SafeImage from '@/components/common/SafeImage';
import { getAdminNavGroups } from './_components/admin-nav-items';

interface AdminMobileNavProps {
  /** Web Vitals 회귀 페이지 개수 — 햄버거 버튼 + Analytics item 옆 dot. */
  regressionCount?: number;
  /** nav item href → 처리 대기 건수. 항목 옆 숫자 뱃지 + 햄버거 dot. */
  badges?: Record<string, number>;
}

export function AdminMobileNav({ regressionCount = 0, badges = {} }: AdminMobileNavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const locale = useLocale() as 'ko' | 'en';
  const t = useTranslations('admin.common');
  const adminNavGroups = getAdminNavGroups(locale);
  const badgesTotal = Object.values(badges).reduce((sum, n) => sum + n, 0);
  const searchParams = useSearchParams();
  const isReviewQueueMode = pathname === '/admin/users' && searchParams.get('status') === 'pending';
  const roleFilter = pathname === '/admin/users' ? searchParams.get('role') : null;

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
        className="relative inline-flex items-center justify-center rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
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
        {(regressionCount > 0 || badgesTotal > 0) && (
          <span
            className="absolute top-1.5 right-1.5 inline-flex h-2 w-2 rounded-full bg-danger-a11y ring-2 ring-white"
            aria-label={
              badgesTotal > 0 ? `처리 대기 ${badgesTotal}건` : `Web Vitals 회귀 ${regressionCount}건`
            }
            title={
              badgesTotal > 0 ? `처리 대기 ${badgesTotal}건` : `Web Vitals 회귀 ${regressionCount}건`
            }
          />
        )}
      </button>

      {/* Portal for Overlay and Drawer - renders at document.body to avoid z-index stacking context issues */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <>
            {/* Overlay */}
            <div
              className="fixed inset-0 z-40 bg-gray-950/35 backdrop-blur-[1px] xl:hidden"
              onClick={() => setIsOpen(false)}
              aria-hidden="true"
            />

            {/* Slide-out Drawer.
                레이아웃 구조: 3단 column flex (header — scrollable items — footer).
                - h-[100dvh]: iOS Safari의 dynamic viewport (URL bar 변동) 정확히 채움.
                  h-full(=100%)는 parent height 의존이라 body가 100vh 보장 안 되면 잘림.
                - 안쪽 `<div h-full>` 중복 제거 — 단일 flex column으로 통일.
                - items 영역 `overflow-y-auto` — 메뉴 길어도 스크롤 가능.
                - footer `pb-[env(safe-area-inset-bottom)]` — iOS notch·home indicator
                  영역에 SignOut이 가려지지 않게 안전 마진. */}
            <dialog
              open
              id="mobile-nav-drawer"
              className="fixed top-0 left-0 m-0 h-[100dvh] max-h-none w-64 max-w-none border-0 bg-white p-0 z-50 flex flex-col xl:hidden"
              aria-modal="true"
              aria-label={t('adminMenu')}
            >
              <div className="shrink-0 flex items-center justify-between border-b border-gray-100 p-4">
                {/* 로고 클릭 시 씨앗페 공개 메인(/)으로 이동 + 드로어 닫기 */}
                <Link
                  href="/"
                  onClick={() => setIsOpen(false)}
                  className="flex items-center rounded transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                >
                  <SafeImage
                    src="/images/logo/320pxX90px.webp"
                    alt="SAF Admin"
                    width={160}
                    height={45}
                    className="h-8 w-auto object-contain"
                  />
                </Link>
                <button
                  type="button"
                  className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
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
              <div className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3">
                {adminNavGroups.map((group, gi) => (
                  <div key={group.label ?? group.items.map((item) => item.href).join('|')}>
                    {gi > 0 && <div className="mb-3 border-t border-gray-100" />}
                    <div className="space-y-1">
                      {group.items.map((item) => {
                        const targetPath = item.href.split('?')[0];
                        const isReviewQueueItem = item.href.includes('status=pending');
                        const isCustomersItem = item.href.includes('role=user');
                        const isUsersItem = item.href === '/admin/users';

                        const isActive = isReviewQueueItem
                          ? pathname === '/admin/users' && isReviewQueueMode
                          : isCustomersItem
                            ? pathname === '/admin/users' &&
                              !isReviewQueueMode &&
                              roleFilter === 'user'
                            : isUsersItem
                              ? pathname === '/admin/users' &&
                                !isReviewQueueMode &&
                                roleFilter !== 'user'
                              : pathname.startsWith(targetPath);
                        const hasAnalyticsAlert =
                          item.href === '/admin/analytics' && regressionCount > 0;
                        const itemBadge = badges[item.href] ?? 0;
                        return (
                          <Link
                            key={item.href}
                            href={item.href}
                            prefetch={item.href.startsWith('/admin/changelog') ? false : undefined}
                            aria-current={isActive ? 'page' : undefined}
                            className={`flex items-center justify-between rounded-md px-3 py-2 text-base font-medium transition-colors ${
                              isActive
                                ? 'bg-primary-surface text-primary-strong ring-1 ring-inset ring-primary-a11y/20'
                                : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                            }`}
                            onClick={() => setIsOpen(false)}
                          >
                            <span>{item.label}</span>
                            {hasAnalyticsAlert ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-danger-a11y/10 px-2 py-0.5 text-xs font-semibold text-danger-a11y">
                                <span className="inline-flex h-1.5 w-1.5 rounded-full bg-danger-a11y" />
                                {regressionCount}
                              </span>
                            ) : (
                              itemBadge > 0 && (
                                <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-danger-a11y px-1.5 py-0.5 text-xs font-semibold leading-none text-white">
                                  {itemBadge}
                                </span>
                              )
                            )}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
              <div className="shrink-0 border-t border-gray-100 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] flex justify-center">
                <SignOutButton />
              </div>
            </dialog>
          </>,
          document.body
        )}
    </>
  );
}
