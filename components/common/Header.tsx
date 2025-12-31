'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '@/components/ui/Button';
import { EXTERNAL_LINKS } from '@/lib/constants';

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
  const [isScrolled, setIsScrolled] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  // 모바일 메뉴 열릴 때 body 스크롤 비활성화 (스크롤바 너비 보정으로 레이아웃 이동 방지)
  useEffect(() => {
    if (mobileMenuOpen) {
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.overflow = 'hidden';
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    } else {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
    };
  }, [mobileMenuOpen]);

  // 페이지 전환 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // 스크롤 감지 로직 (RAF 쓰로틀링 적용)
  useEffect(() => {
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          setIsScrolled(window.scrollY > 10);
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // 초기 상태 확인

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // 히어로 섹션(어두운 배경)이 있는 페이지 목록
  const HERO_PAGES = [
    '/',
    '/our-reality',
    '/our-proof',
    '/exhibition',
    '/archive',
    '/news',
    '/artworks',
  ];
  const hasHero = HERO_PAGES.includes(pathname);

  // Optimize header style logic to prevent stacking context issues
  const getHeaderStyle = () => {
    if (mobileMenuOpen) {
      // Solid white, no backdrop blur (prevents containing block issues for fixed children)
      return 'bg-white shadow-sm border-gray-200/50';
    }
    if (isScrolled || !hasHero) {
      // Scrolled state OR page without hero -> Translucent white
      return 'bg-white/95 backdrop-blur-md shadow-sm border-gray-200/50';
    }
    // Top of Hero page -> Transparent
    return 'bg-transparent border-transparent';
  };

  const headerStyle = getHeaderStyle();

  // If page generally has dark text (no hero) or is scrolled/menu open -> dark text
  // Only transparent hero pages at top get white text
  const isDarkText = isScrolled || mobileMenuOpen || !hasHero;

  const textColor = isDarkText ? 'text-charcoal' : 'text-white';
  const logoSrc = isDarkText
    ? '/images/logo/320pxX90px.webp'
    : '/images/logo/320pxX90px_white.webp';

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-[100] border-b transition-all duration-300 pt-[env(safe-area-inset-top,0px)] ${headerStyle}`}
    >
      <nav className="container-max flex items-center justify-between h-16 transition-all duration-300">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src={logoSrc}
            alt="씨앗페 로고"
            width={160}
            height={45}
            className="h-9 w-auto object-contain transition-all duration-300"
            priority
          />
          <span className="sr-only">씨앗페 2026 홈</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8 h-full">
          {navigation.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`relative flex items-center h-full text-sm font-medium transition-colors focus:outline-none focus-visible:outline-none after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5 after:bg-transparent hover:after:bg-primary/40 after:transition-colors ${textColor} hover:text-primary`}
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center h-full text-sm font-medium transition-colors focus:outline-none focus-visible:outline-none after:absolute after:bottom-3 after:left-0 after:right-0 after:h-0.5 after:transition-colors ${
                  isActive(item.href)
                    ? 'text-primary after:bg-primary'
                    : `${textColor} hover:text-primary after:bg-transparent hover:after:bg-primary/40`
                }`}
              >
                {item.name}
              </Link>
            )
          )}
        </div>
        {/* Donate Button (Desktop) */}
        <div className="hidden lg:flex">
          <Button href={EXTERNAL_LINKS.DONATE} variant="accent" external className="gap-1.5">
            <span className="group-hover:scale-125 transition-transform duration-300">❤️</span>
            <span className="pt-0.5">후원하기</span>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className={`lg:hidden p-3 min-w-[44px] min-h-[44px] flex items-center justify-center transition-transform active:scale-90 ${textColor} hover:text-primary`}
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

      {/* Mobile Menu with AnimatePresence */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] lg:hidden top-[calc(4rem+env(safe-area-inset-top,0px))]"
            />

            {/* Menu */}
            <motion.div
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
                      onClick={() => setMobileMenuOpen(false)}
                      className="block py-3 px-4 text-base rounded-lg transition-colors border-l-4 border-transparent text-charcoal hover:bg-primary/5 hover:border-primary active:bg-primary/10"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-3 px-4 text-base rounded-lg transition-colors border-l-4 ${
                        isActive(item.href)
                          ? 'text-primary font-semibold border-primary bg-primary/10'
                          : 'border-transparent text-charcoal hover:bg-primary/5 hover:border-primary active:bg-primary/10'
                      }`}
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
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span className="group-hover:scale-125 transition-transform duration-300">
                      ❤️
                    </span>
                    <span className="pt-0.5">후원하기</span>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
