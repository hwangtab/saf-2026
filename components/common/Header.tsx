'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import ExportedImage from 'next-image-export-optimizer';
import { usePathname } from 'next/navigation';
import { m, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS, HERO_PAGES } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';
import clsx from 'clsx';

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

const CLOSE_MENU_DELAY = 150;
const SCROLL_UNLOCK_DELAY = 300;

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isScrolled = useScrolled();
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  const handleMobileLinkClick = useCallback(() => {
    setTimeout(() => {
      setMobileMenuOpen(false);
    }, CLOSE_MENU_DELAY);
  }, []);

  useEffect(() => {
    const body = document.body;

    if (mobileMenuOpen) {
      requestAnimationFrame(() => {
        const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        body.style.overflow = 'hidden';
        body.style.overscrollBehavior = 'contain';
        if (scrollbarWidth > 0) {
          body.style.paddingRight = `${scrollbarWidth}px`;
        }
      });
    } else {
      const timer = setTimeout(() => {
        requestAnimationFrame(() => {
          body.style.overflow = '';
          body.style.overscrollBehavior = '';
          body.style.paddingRight = '';
        });
      }, SCROLL_UNLOCK_DELAY);

      return () => clearTimeout(timer);
    }

    return () => {
      body.style.overflow = '';
      body.style.overscrollBehavior = '';
      body.style.paddingRight = '';
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (mobileMenuOpen) {
      handleMobileLinkClick();
    }
  }, [pathname, mobileMenuOpen, handleMobileLinkClick]);

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

        <div className="hidden lg:flex items-center gap-8 h-full">
          {navigation.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  'relative flex items-center h-full text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:outline-none',
                  'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
                  'after:bg-transparent hover:after:bg-primary/40 after:transition-colors',
                  textColor,
                  'hover:text-primary'
                )}
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  'relative flex items-center h-full text-sm font-medium transition-colors',
                  'focus:outline-none focus-visible:outline-none',
                  'after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5',
                  'after:transition-colors',
                  isActive(item.href)
                    ? ['text-primary', 'after:bg-primary']
                    : [
                        textColor,
                        'hover:text-primary',
                        'after:bg-transparent hover:after:bg-primary/40',
                      ]
                )}
              >
                {item.name}
              </Link>
            )
          )}
        </div>
        <div className="hidden lg:flex">
          <Button href={EXTERNAL_LINKS.DONATE} variant="accent" external className="gap-1.5">
            <span className="group-hover:scale-125 transition-transform duration-300">❤️</span>
            <span className="pt-0.5">후원하기</span>
          </Button>
        </div>

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

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <m.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-[110] lg:hidden top-[calc(4rem+env(safe-area-inset-top,0px))]"
            />

            <m.div
              key="menu"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-[calc(4rem+env(safe-area-inset-top,0px))] right-0 w-72 max-w-[85%] bg-white shadow-2xl z-[120] lg:hidden overflow-y-auto pb-[env(safe-area-inset-bottom,20px)]"
              style={{ bottom: 'env(safe-area-inset-bottom, 0px)' }}
            >
              <div className="py-4 px-5 space-y-3">
                {navigation.map((item) =>
                  item.external ? (
                    <a
                      key={item.href}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={handleMobileLinkClick}
                      className="block py-3 px-4 text-base rounded-lg transition-colors border-l-4 border-transparent text-charcoal hover:bg-primary/5 hover:border-primary active:bg-primary/10"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleMobileLinkClick}
                      className={clsx(
                        'block py-3 px-4 text-base rounded-lg transition-colors border-l-4',
                        isActive(item.href)
                          ? ['text-primary font-semibold border-primary bg-primary/10']
                          : [
                              'border-transparent text-charcoal',
                              'hover:bg-primary/5 hover:border-primary active:bg-primary/10',
                            ]
                      )}
                    >
                      {item.name}
                    </Link>
                  )
                )}
                <div className="mt-4">
                  <Button
                    href={EXTERNAL_LINKS.DONATE}
                    variant="accent"
                    external
                    className="w-full gap-1.5"
                    onClick={handleMobileLinkClick}
                  >
                    <span className="group-hover:scale-125 transition-transform duration-300">
                      ❤️
                    </span>
                    <span className="pt-0.5">후원하기</span>
                  </Button>
                </div>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
