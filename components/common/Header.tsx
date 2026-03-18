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

const FullscreenMenu = dynamic(() => import('./Header/FullscreenMenu'), { ssr: false });

export default function Header() {
  return <PublicHeader />;
}

function PublicHeader() {
  const t = useTranslations('nav');
  const { isMenuOpen, openMenu, closeMenu, isActive, headerStyle, isDarkText, textColor } =
    useHeaderStyle();
  const navigation = useLocalizedNavigation();

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 transition-[border-color,backdrop-filter] duration-200',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
      style={{
        zIndex: Z_INDEX.HEADER,
        willChange: 'background-color, border-color',
      }}
    >
      <nav className="relative container-max flex items-center justify-between h-16">
        <HeaderLogo isDarkText={isDarkText} />

        <DesktopNav navigation={navigation} isActive={isActive} textColor={textColor} />

        <button
          type="button"
          onClick={openMenu}
          className={clsx(
            'md:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
            'transition-transform active:scale-90',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg',
            textColor,
            'hover:text-primary'
          )}
          aria-label={t('toggleMenu')}
          aria-expanded={isMenuOpen}
        >
          <MenuToggleIcon isOpen={isMenuOpen} />
        </button>
      </nav>

      {/* Fullscreen menu */}
      <FullscreenMenu
        isOpen={isMenuOpen}
        onClose={closeMenu}
        navigation={navigation}
        isActive={isActive}
      />
    </header>
  );
}
