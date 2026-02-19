'use client';

import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import DesktopNav from './Header/DesktopNav';
import FullscreenMenu from './Header/FullscreenMenu';
import HeaderLogo from './Header/HeaderLogo';
import MenuToggleIcon from '@/components/ui/MenuToggleIcon';
import { Z_INDEX } from '@/lib/constants';
import { UI_STRINGS } from '@/lib/ui-strings';
import { useHeaderStyle } from '@/lib/hooks/useHeaderStyle';
import { shouldHidePublicHeader } from '@/lib/path-rules';
import { MAIN_NAVIGATION } from '@/lib/menus';

export default function Header() {
  const pathname = usePathname();

  // Hide main header on admin and dashboard pages to prevent overlapping with specialized headers
  if (shouldHidePublicHeader(pathname)) {
    return null;
  }

  return <PublicHeader />;
}

function PublicHeader() {
  const { isMenuOpen, openMenu, closeMenu, isActive, headerStyle, isDarkText, textColor } =
    useHeaderStyle();

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 transition-colors duration-300',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
      style={{
        zIndex: Z_INDEX.HEADER,
        willChange: 'background-color, border-color',
      }}
    >
      <nav className="relative container-max flex items-center justify-between h-16 transition-colors duration-300">
        <HeaderLogo isDarkText={isDarkText} />

        <DesktopNav navigation={MAIN_NAVIGATION} isActive={isActive} textColor={textColor} />

        <button
          onClick={openMenu}
          className={clsx(
            'md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
            'transition-transform active:scale-90',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
            textColor,
            'hover:text-primary'
          )}
          aria-label={UI_STRINGS.NAV.TOGGLE_MENU}
          aria-expanded={isMenuOpen}
        >
          <MenuToggleIcon isOpen={isMenuOpen} />
        </button>
      </nav>

      {/* 풀스크린 메뉴 - 네이티브 dialog 사용 */}
      <FullscreenMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        navigation={MAIN_NAVIGATION}
        isActive={isActive}
      />
    </header>
  );
}
