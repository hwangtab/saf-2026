'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import IdleMount from '@/components/common/IdleMount';

import type { NavigationItem } from '@/types';
import DesktopNavItem from './DesktopNavItem';
import WishlistNavButton from './WishlistNavButton';

// AuthButtons는 createSupabaseBrowserClient를 정적 import → 다이나믹 청크가 @supabase/ssr
// 전체 SDK(~186KB raw / ~49KB gzip)를 포함. 모든 공개 페이지 헤더에서 fire되어
// PSI mobile bundle audit에서 "80% unused JS" 최상위 chunk로 검출됨.
// IdleMount로 requestIdleCallback까지 mount를 지연 — placeholder가 동일 크기라 CLS=0,
// 사용자에게는 인증 상태가 paint 후 ~50-200ms 늦게 채워지는 정도라 체감 회귀 없음.
//
// size="xs"의 AuthButtons 내부 fallback이 h-9 w-20을 쓰므로 IdleMount placeholder도
// 정확히 동일하게 맞춰 두 단계 mount(idle → mounted-loading → mounted-resolved) 전체에서
// 동일한 박스를 유지 — CLS=0.
const AUTH_BUTTONS_PLACEHOLDER = (
  <div className="h-9 w-20 bg-gray-100/50 animate-pulse rounded-full" />
);

const AuthButtons = dynamic(() => import('@/components/auth/AuthButtons'), {
  ssr: false,
  loading: () => AUTH_BUTTONS_PLACEHOLDER,
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
    'inline-flex items-center gap-1 text-xs font-medium rounded-full px-2.5 py-1 min-h-0',
    'border transition-colors duration-200',
    isInverse
      ? 'border-white/30 bg-white/10 text-white/90 hover:bg-white/20 hover:border-white/50'
      : 'border-gray-200 bg-gray-50 text-charcoal-muted hover:border-gray-300 hover:bg-gray-100'
  );

  return (
    <>
      <ul className="hidden lg:flex xl:absolute xl:left-1/2 xl:-translate-x-1/2 top-0 items-center gap-5 xl:gap-8 h-full m-0 p-0 list-none">
        {navigation.map((item) => (
          <DesktopNavItem key={item.name} item={item} isActive={isActive} textColor={textColor} />
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

        {/* Utility Menu (Order Status) — chrome utility, 매 페이지 prefetch 회피 */}
        <Link href="/orders" prefetch={false} className={utilityButtonClassName}>
          {t('orderStatus')}
        </Link>

        <IdleMount fallback={AUTH_BUTTONS_PLACEHOLDER}>
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
        </IdleMount>

        {/* 위시리스트 — 로그인 버튼 옆에 배치 */}
        <WishlistNavButton textColor={textColor} />

        <LanguageSwitcher className={textColor} compact inverse={isInverse} />
      </div>
    </>
  );
}
