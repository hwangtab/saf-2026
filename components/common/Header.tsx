'use client';

import { useReducer, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { usePathname } from 'next/navigation';
import { HERO_PAGES, Z_INDEX } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';
import type { NavigationItem } from '@/lib/types';
import clsx from 'clsx';

import DesktopNav from './Header/DesktopNav';
import MobileMenu from './Header/MobileMenu';
import { MenuIcon, CloseMenuIcon } from '@/components/ui/Icons';

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
  const scrollPositionRef = useRef(0);

  // Define scroll functions first
  const lockScroll = useCallback(() => {
    const body = document.body;
    const html = document.documentElement;
    // Store current scroll position
    scrollPositionRef.current = window.scrollY;
    // Apply fixed positioning to prevent scroll
    body.style.position = 'fixed';
    body.style.top = `-${scrollPositionRef.current}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overscrollBehavior = 'contain';
    html.style.scrollBehavior = 'auto';
  }, []);

  const unlockScroll = useCallback(() => {
    const body = document.body;
    const html = document.documentElement;
    // Remove fixed positioning
    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.overscrollBehavior = '';
    html.style.scrollBehavior = '';
    // Restore scroll position
    window.scrollTo(0, scrollPositionRef.current);
  }, []);

  // Menu action callbacks
  const openMenu = useCallback(() => dispatch({ type: 'OPEN' }), []);
  const startCloseMenu = useCallback(() => dispatch({ type: 'START_CLOSE' }), []);
  const finishCloseMenu = useCallback(() => {
    dispatch({ type: 'FINISH_CLOSE' });
    unlockScroll();
  }, [unlockScroll]);

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
        startCloseMenu();
      }
      prevPathname.current = pathname;
    }
  }, [pathname, isMenuOpen, startCloseMenu]);

  // Cleanup on unmount
  useEffect(() => {
    return () => unlockScroll();
  }, [unlockScroll]);

  const isArtworkDetail = pathname.startsWith('/artworks/') && pathname !== '/artworks';
  const hasHero = HERO_PAGES.includes(pathname as (typeof HERO_PAGES)[number]) && !isArtworkDetail;

  const getHeaderStyle = () => {
    if (isMenuVisible) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    if (isArtworkDetail || isScrolled || !hasHero) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    return 'bg-transparent border-transparent';
  };

  const headerStyle = getHeaderStyle();
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
            alt="씨앗페 로고"
            width={160}
            height={45}
            className="h-9 w-auto object-contain transition-all duration-300"
            priority
          />
          <span className="sr-only">씨앗페 2026 홈</span>
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
          aria-label="메뉴 토글"
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
        onAnimationComplete={(definition) => {
          if (definition === 'animate') lockScroll();
        }}
        onExitComplete={finishCloseMenu}
      />
    </header>
  );
}
