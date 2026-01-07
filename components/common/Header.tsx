'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { usePathname } from 'next/navigation';
import { HERO_PAGES } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';
import clsx from 'clsx';

import DesktopNav from './Header/DesktopNav';
import MobileMenu from './Header/MobileMenu';

type NavigationItem = {
  name: string;
  href: string;
  external?: boolean;
};

const navigation: NavigationItem[] = [
  { name: '씨앗페 2026', href: '/' },
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '전시 안내', href: '/exhibition' },
  { name: '출품작', href: '/artworks' },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isScrolled = useScrolled(10, mobileMenuOpen);
  const pathname = usePathname();
  const prevPathname = useRef(pathname);

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  useEffect(() => {
    if (prevPathname.current !== pathname) {
      setMobileMenuOpen(false);
      prevPathname.current = pathname;
    }
  }, [pathname]);

  const lockScroll = () => {
    const body = document.body;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    body.style.overflowY = 'hidden';
    body.style.overscrollBehavior = 'contain';

    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }
  };

  const unlockScroll = () => {
    const body = document.body;
    body.style.overflowY = '';
    body.style.overscrollBehavior = '';
    body.style.paddingRight = '';
  };

  useEffect(() => {
    return () => unlockScroll();
  }, []);

  const isArtworkDetail = pathname.startsWith('/artworks/') && pathname !== '/artworks';
  const hasHero = HERO_PAGES.includes(pathname as (typeof HERO_PAGES)[number]) && !isArtworkDetail;

  const getHeaderStyle = () => {
    if (mobileMenuOpen) {
      return 'bg-white shadow-sm border-gray-200/50';
    }
    if (isArtworkDetail) {
      return 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200/50';
    }
    if (isScrolled || !hasHero) {
      return 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200/50';
    }
    return 'bg-transparent border-transparent';
  };

  const headerStyle = getHeaderStyle();
  const isDarkText = isScrolled || mobileMenuOpen || !hasHero || isArtworkDetail;
  const textColor = isDarkText ? 'text-charcoal' : 'text-white';
  const logoSrc = isDarkText
    ? '/images/logo/320pxX90px.webp'
    : '/images/logo/320pxX90px_white.webp';

  return (
    <header
      className={clsx(
        'fixed top-0 left-0 right-0 z-[100] border-b transition-all duration-300',
        'pt-[env(safe-area-inset-top,0px)]',
        headerStyle
      )}
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
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={clsx(
            'lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center',
            'transition-transform active:scale-90',
            textColor,
            'hover:text-primary'
          )}
          aria-label="메뉴 토글"
          aria-expanded={mobileMenuOpen}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileMenuOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            )}
          </svg>
        </button>
      </nav>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        navigation={navigation}
        isActive={isActive}
        onAnimationComplete={(definition) => {
          if (definition === 'animate') lockScroll();
        }}
        onExitComplete={unlockScroll}
      />
    </header>
  );
}
