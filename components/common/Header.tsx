'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { EXTERNAL_LINKS } from '@/lib/constants';

const navigation = [
  { name: '씨앗페 2026', href: '/' },
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '전시 안내', href: '/exhibition' },
  { name: '작품 구매하기', href: EXTERNAL_LINKS.ONLINE_GALLERY, external: true },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  // 모바일 메뉴 열릴 때 body 스크롤 비활성화
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [mobileMenuOpen]);

  // 페이지 전환 시 모바일 메뉴 닫기
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="container-max flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/images/logo/320pxX90px.webp"
            alt="씨앗페 로고"
            width={160}
            height={45}
            className="h-9 w-auto"
            priority
          />
          <span className="sr-only">씨앗페 2026 홈</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex items-center gap-8">
          {navigation.map((item) =>
            item.external ? (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium transition-colors pb-1 border-b-2 border-transparent text-charcoal hover:text-primary hover:border-primary/40 focus:outline-none focus-visible:outline-none focus-visible:border-primary"
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors pb-1 border-b-2 focus:outline-none focus-visible:outline-none ${isActive(item.href)
                    ? 'text-primary border-primary'
                    : 'border-transparent text-charcoal hover:text-primary hover:border-primary/40 focus-visible:border-primary'
                  }`}
              >
                {item.name}
              </Link>
            )
          )}
        </div>
        {/* Donate Button (Desktop) */}
        <div className="hidden lg:flex">
          <a
            href={EXTERNAL_LINKS.DONATE}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-accent hover:bg-accent-strong text-light font-bold px-6 py-2 rounded-lg transition-colors"
          >
            ❤️ 후원하기
          </a>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-charcoal hover:text-primary"
          aria-label="메뉴 토글"
          aria-expanded={mobileMenuOpen}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
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
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Menu */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-80 max-w-[85%] bg-white shadow-2xl z-50 lg:hidden overflow-y-auto"
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
                      className="block py-3 px-4 text-base rounded-lg transition-colors border-l-4 border-transparent text-charcoal hover:bg-primary/5 hover:border-primary"
                    >
                      {item.name}
                    </a>
                  ) : (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`block py-3 px-4 text-base rounded-lg transition-colors border-l-4 ${isActive(item.href)
                          ? 'text-primary font-semibold border-primary bg-primary/10'
                          : 'border-transparent text-charcoal hover:bg-primary/5 hover:border-primary'
                        }`}
                    >
                      {item.name}
                    </Link>
                  )
                )}
                <a
                  href={EXTERNAL_LINKS.DONATE}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block w-full bg-accent hover:bg-accent-strong text-light font-bold px-4 py-3 rounded-lg text-center transition-colors mt-4"
                >
                  ❤️ 후원하기
                </a>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
