'use client';

import type { NavigationItem } from '@/types';
import clsx from 'clsx';
import { Z_INDEX, EXTERNAL_LINKS } from '@/lib/constants';
import { UI_STRINGS } from '@/lib/ui-strings';
import { useHeaderStyle } from '@/lib/hooks/useHeaderStyle';

import DesktopNav from './Header/DesktopNav';
import FullscreenMenu from './Header/FullscreenMenu';
import HeaderLogo from './Header/HeaderLogo';
import { MenuIcon } from '@/components/ui/Icons';

const navigation: NavigationItem[] = [
  { name: '출품작', href: '/artworks' },
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
  { name: UI_STRINGS.NAV.ORDER_STATUS, href: EXTERNAL_LINKS.ORDER_STATUS, external: true },
];

export default function Header() {
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

        <DesktopNav navigation={navigation} isActive={isActive} textColor={textColor} />

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
          <MenuIcon />
        </button>
      </nav>

      {/* 풀스크린 메뉴 - 네이티브 dialog 사용 */}
      <FullscreenMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        navigation={navigation}
        isActive={isActive}
      />
    </header>
  );
}
