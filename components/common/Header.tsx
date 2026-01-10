'use client';

import { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { usePathname } from 'next/navigation';
import { HERO_PAGES, Z_INDEX } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';
import type { NavigationItem } from '@/types';
import clsx from 'clsx';

import DesktopNav from './Header/DesktopNav';
import FullscreenMenu from './Header/FullscreenMenu';
import { MenuIcon } from '@/components/ui/Icons';
import { UI_STRINGS } from '@/lib/ui-strings';

const navigation: NavigationItem[] = [
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '전시 안내', href: '/exhibition' },
  { name: '출품작', href: '/artworks' },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
];

export default function Header() {
  // 단순 boolean 상태로 변경 (useReducer 제거)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 네이티브 <dialog>가 스크롤 잠금을 처리하므로 useScrollLock 불필요
  const isScrolled = useScrolled(10, isMenuOpen);
  const pathname = usePathname();

  const isActive = useCallback(
    (href: string) => {
      if (href === '/' && pathname === '/') return true;
      if (href !== '/' && pathname.startsWith(href)) return true;
      return false;
    },
    [pathname]
  );

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  // 경로 기반 파생 상태 메모이제이션
  const { isArtworkDetail, hasHero } = useMemo(() => {
    const artistPage = pathname.startsWith('/artworks/artist/');
    const artworkDetail =
      pathname.startsWith('/artworks/') && pathname !== '/artworks' && !artistPage;
    const heroPage =
      (HERO_PAGES.includes(pathname as (typeof HERO_PAGES)[number]) && !artworkDetail) ||
      artistPage;
    return { isArtworkDetail: artworkDetail, hasHero: heroPage };
  }, [pathname]);

  // 헤더 스타일 메모이제이션 (메뉴가 풀스크린이므로 isMenuVisible 조건 제거)
  const headerStyle = useMemo(() => {
    if (isArtworkDetail || isScrolled || !hasHero) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    return 'bg-transparent border-transparent';
  }, [isArtworkDetail, isScrolled, hasHero]);

  const isDarkText = isScrolled || !hasHero || isArtworkDetail;
  const textColor = isDarkText ? 'text-charcoal' : 'text-white';

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 border-b transition-colors duration-300',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
      style={{
        zIndex: Z_INDEX.HEADER,
        willChange: 'background-color, border-color',
      }}
    >
      <nav className="container-max flex items-center justify-between h-16 transition-colors duration-300">
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="relative h-9 w-40">
            <ExportedImage
              src="/images/logo/320pxX90px.webp"
              alt={UI_STRINGS.A11Y.LOGO_ALT}
              width={160}
              height={45}
              className={clsx(
                'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
                isDarkText ? 'opacity-100' : 'opacity-0'
              )}
              priority
            />
            <ExportedImage
              src="/images/logo/320pxX90px_white.webp"
              alt=""
              aria-hidden="true"
              width={160}
              height={45}
              className={clsx(
                'absolute inset-0 h-9 w-auto object-contain transition-opacity duration-300',
                isDarkText ? 'opacity-0' : 'opacity-100'
              )}
              priority
            />
          </div>
          <span className="sr-only">{UI_STRINGS.A11Y.HOME_LINK}</span>
        </Link>

        <DesktopNav navigation={navigation} isActive={isActive} textColor={textColor} />

        <button
          onClick={openMenu}
          className={clsx(
            'lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
            'transition-transform active:scale-90',
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
