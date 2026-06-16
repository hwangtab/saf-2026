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
import CartNavButton from './CartNavButton';

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
      {/* 흐름(in-flow) 유지 — xl:absolute 중앙정렬은 공간을 reserve하지 않아 우측 유틸리티
          클러스터(검색·주문조회·관리자 대시보드·위시·카트)가 넓어지면 마지막 nav 항목과 겹침
          (관리자 로그인 시 재현). flex 흐름에 두면 nav·유틸리티가 서로 공간을 밀어내 겹침이
          구조적으로 불가능. lg(1024~1279)에서 이미 흐름 배치로 정상 동작하던 방식을 xl로 확장. */}
      <ul className="hidden lg:flex items-center gap-5 xl:gap-8 h-full m-0 p-0 list-none">
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

        {/* pill 그룹(검색·주문조회·로그인)과 아이콘 액션(위시·카트)을 시각적으로 구분하는 옅은 divider.
            textColor에 적응 — hero(흰 글씨)에선 white/25, solid 헤더에선 gray-300. */}
        <span
          aria-hidden="true"
          className={clsx('h-5 w-px shrink-0', isInverse ? 'bg-white/25' : 'bg-gray-300')}
        />

        {/* 위시리스트 — 로그인 버튼 옆에 배치 */}
        <WishlistNavButton textColor={textColor} />

        {/* 카트 — 위시리스트 옆에 배치, 클릭 시 드로어 open */}
        <CartNavButton textColor={textColor} />

        <LanguageSwitcher className={textColor} compact inverse={isInverse} />
      </div>
    </>
  );
}
