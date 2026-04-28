'use client';

import dynamic from 'next/dynamic';
import clsx from 'clsx';
import { useTranslations } from 'next-intl';
import DesktopNav from './Header/DesktopNav';
import HeaderLogo from './Header/HeaderLogo';
import MenuToggleIcon from '@/components/ui/MenuToggleIcon';
import { Z_INDEX } from '@/lib/constants';
import { useHeaderStyle } from '@/lib/hooks/useHeaderStyle';
import { useLocalizedNavigation } from '@/lib/hooks/useLocalizedNavigation';
import { useGlobalSearch } from '@/lib/hooks/useGlobalSearch';

const FullscreenMenu = dynamic(() => import('./Header/FullscreenMenu'), { ssr: false });
const GlobalSearchDialog = dynamic(
  () => import('@/components/features/search/GlobalSearchDialog'),
  { ssr: false }
);

export default function Header() {
  return <PublicHeader />;
}

function PublicHeader() {
  const t = useTranslations('nav');
  const { isMenuOpen, openMenu, closeMenu, isActive, headerStyle, isDarkText, textColor } =
    useHeaderStyle();
  const navigation = useLocalizedNavigation();
  const search = useGlobalSearch();

  const handleOpenSearch = () => {
    if (isMenuOpen) {
      // 메뉴 닫기 후 스크롤 복원 effect가 완료된 뒤에 검색 다이얼로그 열기
      closeMenu();
      setTimeout(() => search.open(), 50);
    } else {
      search.open();
    }
  };

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 isolate transition-[background-color,border-color,backdrop-filter] duration-200',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
      style={{
        zIndex: Z_INDEX.HEADER,
        willChange: 'background-color, border-color',
      }}
    >
      {/* transparent(hero) 모드 전용 fade — 흰글씨가 어떤 페이지 배경 위에서도 가독성 보장.
          solid 모드에선 opacity-0 + 헤더 자체 bg-white/80가 위에 깔려 자연스럽게 사라짐.
          헤더 영역 64px 높이만 어둡게, hero gradient와 자연스럽게 섞임. */}
      <div
        aria-hidden="true"
        className={clsx(
          'absolute inset-0 -z-10 pointer-events-none bg-gradient-to-b from-black/30 via-black/10 to-transparent transition-opacity duration-200',
          isDarkText ? 'opacity-0' : 'opacity-100'
        )}
      />
      <nav className="relative container-max flex items-center justify-between h-16">
        <HeaderLogo isDarkText={isDarkText} />

        <DesktopNav
          navigation={navigation}
          isActive={isActive}
          textColor={textColor}
          onSearchClick={handleOpenSearch}
        />

        <div className="lg:hidden flex items-center gap-1">
          {/* 모바일 검색 버튼 */}
          <button
            type="button"
            onClick={handleOpenSearch}
            className={clsx(
              'p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
              'transition-transform active:scale-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
              textColor,
              'hover:text-primary'
            )}
            aria-label={t('searchButton')}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
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
          </button>

          {/* 모바일 메뉴 토글 */}
          <button
            type="button"
            onClick={openMenu}
            className={clsx(
              'p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
              'transition-transform active:scale-90',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
              textColor,
              'hover:text-primary'
            )}
            aria-label={t('toggleMenu')}
            aria-expanded={isMenuOpen}
          >
            <MenuToggleIcon isOpen={isMenuOpen} />
          </button>
        </div>
      </nav>

      {/* Fullscreen menu */}
      <FullscreenMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        navigation={navigation}
        isActive={isActive}
        onSearchClick={handleOpenSearch}
      />

      {/* Global search dialog */}
      <GlobalSearchDialog
        isOpen={search.isOpen}
        query={search.query}
        results={search.results}
        isLoading={search.isLoading}
        error={search.error}
        onClose={search.close}
        onQueryChange={search.setQuery}
      />
    </header>
  );
}
