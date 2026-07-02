'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLocale } from 'next-intl';
import { getAdminNavGroups } from './_components/admin-nav-items';
import { NavDropdown } from './_components/NavDropdown';

interface AdminDesktopNavProps {
  /**
   * Web Vitals 회귀 페이지 개수 — 있으면 "분석"/"Analytics" 그룹 옆 alert dot.
   * '/admin/analytics' href를 포함한 group을 자동 식별해 dot 표시.
   */
  regressionCount?: number;
  /** nav item href → 처리 대기 건수. 항목/그룹 옆 숫자 뱃지로 표시. */
  badges?: Record<string, number>;
}

export function AdminDesktopNav({ regressionCount = 0, badges = {} }: AdminDesktopNavProps) {
  const pathname = usePathname();
  const locale = useLocale();
  const adminNavGroups = getAdminNavGroups(locale as 'ko' | 'en');

  return (
    <div className="hidden xl:ml-6 xl:flex xl:items-center xl:gap-3">
      {adminNavGroups.map((group, gi) => {
        const isAnalyticsGroup = group.items.some((it) => it.href === '/admin/analytics');
        return (
          <div
            key={group.label ?? group.items.map((item) => item.href).join('|')}
            className="flex items-center gap-3"
          >
            {gi > 0 && <div className="h-4 w-px bg-gray-200" aria-hidden="true" />}

            {group.label ? (
              <NavDropdown
                label={group.label}
                items={group.items}
                alertCount={isAnalyticsGroup ? regressionCount : 0}
                badges={badges}
              />
            ) : (
              <div className="flex items-center gap-4">
                {group.items.map((item) => {
                  const targetPath = item.href.split('?')[0];
                  const isActive = pathname.startsWith(targetPath);
                  const disablePrefetch = item.href.startsWith('/admin/changelog');

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={disablePrefetch ? false : undefined}
                      aria-current={isActive ? 'page' : undefined}
                      className={`inline-flex items-center whitespace-nowrap border-b-2 px-1 pt-1 pb-2 text-sm font-medium ${
                        isActive
                          ? 'border-primary-a11y text-primary-strong'
                          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
      })}
    </div>
  );
}
