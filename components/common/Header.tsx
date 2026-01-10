'use client';

import { useReducer, useEffect, useRef, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { usePathname } from 'next/navigation';
import type { AnimationDefinition } from 'framer-motion';
import { HERO_PAGES, Z_INDEX } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';
import { useScrollLock } from '@/lib/hooks/useScrollLock';
import type { NavigationItem } from '@/types';
import clsx from 'clsx';

import DesktopNav from './Header/DesktopNav';
import MobileMenu from './Header/MobileMenu';
import { MenuIcon, CloseMenuIcon } from '@/components/ui/Icons';
import { UI_STRINGS } from '@/lib/ui-strings';

const navigation: NavigationItem[] = [
  { name: '씨앗페 2026', href: '/' },
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '전시 안내', href: '/exhibition' },
  { name: '출품작', href: '/artworks' },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
];

// Mobile menu state machine
type MenuState = 'closed' | 'open' | 'closing';
type MenuAction = { type: 'OPEN' } | { type: 'START_CLOSE' } | { type: 'FINISH_CLOSE' };

function menuReducer(state: MenuState, action: MenuAction): MenuState {
  switch (action.type) {
    case 'OPEN':
      return 'open';
    case 'START_CLOSE':
      return state === 'open' ? 'closing' : state;
    case 'FINISH_CLOSE':
      return state === 'closing' ? 'closed' : state;
    default:
      return state;
  }
}

export default function Header() {
  const [menuState, dispatch] = useReducer(menuReducer, 'closed');
  const isMenuOpen = menuState === 'open';
  const isMenuVisible = menuState !== 'closed';

  const isScrolled = useScrolled(10, isMenuOpen);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/' && pathname === '/') return true;
      if (href !== '/' && pathname.startsWith(href)) return true;
      return false;
    },
    [pathname]
  );

  // Store scroll position for scroll lock
  const shouldRestoreScrollRef = useRef(true);
  const { lockScroll, unlockScroll } = useScrollLock();

  // Menu action callbacks
  const openMenu = useCallback(() => {
    shouldRestoreScrollRef.current = true;
    dispatch({ type: 'OPEN' });
  }, []);
  const startCloseMenu = useCallback(() => dispatch({ type: 'START_CLOSE' }), []);
  const finishCloseMenu = useCallback(() => {
    dispatch({ type: 'FINISH_CLOSE' });
    unlockScroll(shouldRestoreScrollRef.current);
  }, [unlockScroll]);

  // MobileMenu onAnimationComplete 콜백 메모이제이션
  const handleAnimationComplete = useCallback(
    (definition: AnimationDefinition) => {
      if (definition === 'animate') lockScroll();
    },
    [lockScroll]
  );

  const toggleMenu = useCallback(() => {
    if (isMenuOpen) {
      startCloseMenu();
    } else {
      openMenu();
    }
  }, [isMenuOpen, startCloseMenu, openMenu]);

  // Close menu on route change
  useEffect(() => {
    if (prevPathname.current !== pathname) {
      if (isMenuOpen) {
        // Navigation occurred: Do NOT restore scroll
        shouldRestoreScrollRef.current = false;
        startCloseMenu();
      }
      prevPathname.current = pathname;
    }
  }, [pathname, isMenuOpen, startCloseMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => unlockScroll();
  }, [unlockScroll]);

  // 경로 기반 파생 상태 메모이제이션
  const { isArtworkDetail, hasHero } = useMemo(() => {
    const artistPage = pathname.startsWith('/artworks/artist/');
    // 작품 상세 페이지는 제외하지만 artist 페이지는 포함하지 않음
    const artworkDetail =
      pathname.startsWith('/artworks/') && pathname !== '/artworks' && !artistPage;
    // 작가 페이지도 Hero가 있으므로 hasHero에 포함
    const heroPage =
      (HERO_PAGES.includes(pathname as (typeof HERO_PAGES)[number]) && !artworkDetail) ||
      artistPage;
    return { isArtworkDetail: artworkDetail, hasHero: heroPage };
  }, [pathname]);

  // 헤더 스타일 메모이제이션
  const headerStyle = useMemo(() => {
    if (isMenuVisible) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    if (isArtworkDetail || isScrolled || !hasHero) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    return 'bg-transparent border-transparent';
  }, [isMenuVisible, isArtworkDetail, isScrolled, hasHero]);

  const isDarkText = isScrolled || isMenuVisible || !hasHero || isArtworkDetail;
  const textColor = isDarkText ? 'text-charcoal' : 'text-white';
  const logoSrc = isDarkText
    ? '/images/logo/320pxX90px.webp'
    : '/images/logo/320pxX90px_white.webp';

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 border-b transition-all duration-300',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
      style={{ zIndex: Z_INDEX.HEADER }}
    >
      <nav className="container-max flex items-center justify-between h-16 transition-all duration-300">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <ExportedImage
            src={logoSrc}
            alt={UI_STRINGS.A11Y.LOGO_ALT}
            width={160}
            height={45}
            className="h-9 w-auto object-contain transition-all duration-300"
            priority
          />
          <span className="sr-only">{UI_STRINGS.A11Y.HOME_LINK}</span>
        </Link>

        <DesktopNav navigation={navigation} isActive={isActive} textColor={textColor} />

        <button
          onClick={toggleMenu}
          className={clsx(
            'lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
            'transition-transform active:scale-90',
            textColor,
            'hover:text-primary'
          )}
          aria-label={UI_STRINGS.NAV.TOGGLE_MENU}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? <CloseMenuIcon /> : <MenuIcon />}
        </button>
      </nav>

      <MobileMenu
        isOpen={isMenuOpen}
        onClose={startCloseMenu}
        navigation={navigation}
        isActive={isActive}
        onAnimationComplete={handleAnimationComplete}
        onExitComplete={finishCloseMenu}
      />
    </header>
  );
}
