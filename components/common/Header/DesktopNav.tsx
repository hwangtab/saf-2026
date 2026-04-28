'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

import type { NavigationItem } from '@/types';
import NavLink from './NavLink';

const AuthButtons = dynamic(() => import('@/components/auth/AuthButtons'), {
  ssr: false,
  loading: () => <div className="h-10 w-24 bg-gray-100/50 animate-pulse rounded-full" />,
});

interface DesktopNavProps {
  navigation: NavigationItem[];
  isActive: (href: string) => boolean;
  textColor: string;
  onSearchClick: () => void;
}

export default function DesktopNav({
  navigation,
  isActive,
  textColor,
  onSearchClick,
}: DesktopNavProps) {
  const t = useTranslations('nav');
  const tSearch = useTranslations('globalSearch');
  const isInverse = textColor === 'text-white';
  const utilityButtonClassName = clsx(
    'flex items-center gap-1.5 text-sm font-medium rounded-full px-3 py-1.5',
    'border transition-colors duration-200',
    isInverse
      ? 'border-white/30 bg-white/10 text-white/90 hover:bg-white/20 hover:border-white/50'
      : 'border-gray-200 bg-gray-50 text-charcoal-muted hover:border-gray-300 hover:bg-gray-100'
  );

  return (
    <>
      <ul className="hidden lg:flex xl:absolute xl:left-1/2 xl:-translate-x-1/2 top-0 items-center gap-5 xl:gap-8 h-full m-0 p-0 list-none">
        {navigation.map((item) => (
          <li key={item.name} className="h-full flex items-center group relative">
            <div className="relative h-full flex items-center">
              <NavLink item={item} isActive={isActive(item.href)} textColor={textColor} />

              {/* Dropdown Menu */}
              {item.items && item.items.length > 0 && (
                <div className="absolute top-full left-0 pt-2 opacity-0 translate-y-2 invisible group-hover:opacity-100 group-hover:translate-y-0 group-hover:visible transition-[opacity,transform,visibility] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] min-w-[240px] z-50 before:absolute before:h-4 before:w-full before:-top-4 before:left-0 before:content-['']">
                  <div className="bg-white rounded-lg shadow-xl border border-gray-100 p-2 overflow-hidden">
                    <ul className="flex flex-col gap-1">
                      {item.items.map((subItem) => (
                        <li key={subItem.href}>
                          <NavLink
                            item={subItem}
                            isActive={isActive(subItem.href)}
                            textColor="text-charcoal hover:bg-gray-50 flex flex-col items-start text-left p-3 rounded-md transition-colors"
                            isSubItem
                          />
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden lg:flex items-center gap-1.5">
        {/* 검색 버튼 */}
        <button
          type="button"
          onClick={onSearchClick}
          className={utilityButtonClassName}
          aria-label={tSearch('dialogLabel')}
          title={tSearch('triggerTooltip')}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>{tSearch('searchButton')}</span>
        </button>

        {/* Utility Menu (Order Status) */}
        <Link href="/orders" className={utilityButtonClassName}>
          {t('orderStatus')}
        </Link>

        <AuthButtons
          size="xs"
          variant="white"
          buttonClassName={clsx(
            utilityButtonClassName,
            // cva 기본 hover/active scale 무효화 — utility의 transition-colors가 transform transition을
            // 덮어써 scale이 즉시 토글되며 떨림 현상 발생
            'hover:scale-100 active:scale-100 hover:shadow-none'
          )}
        />

        <LanguageSwitcher className={textColor} compact />
      </div>
    </>
  );
}
