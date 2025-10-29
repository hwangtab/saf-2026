'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { EXTERNAL_LINKS } from '@/lib/constants';

const navigation = [
  { name: '씨앗:페 2026', href: '/' },
  { name: '우리의 현실', href: '/our-reality' },
  { name: '우리의 증명', href: '/our-proof' },
  { name: '아카이브', href: '/archive' },
  { name: '언론 보도', href: '/news' },
  { name: '전시 안내', href: '/exhibition' },
  { name: '작품 구매하기', href: EXTERNAL_LINKS.ONLINE_GALLERY, external: true },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/' && pathname === '/') return true;
    if (href !== '/' && pathname.startsWith(href)) return true;
    return false;
  };

  return (
    <header className="sticky top-0 z-50 bg-white shadow-sm">
      <nav className="container-max flex items-center justify-between h-16">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Image
            src="/images/logo/320pxX90px.png"
            alt="씨앗:페 로고"
            width={160}
            height={45}
            className="h-9 w-auto"
            priority
          />
          <span className="sr-only">씨앗:페 2026 홈</span>
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
                className="text-sm font-medium transition-colors pb-1 border-b-2 border-transparent text-charcoal hover:text-primary hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary"
              >
                {item.name}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={`text-sm font-medium transition-colors pb-1 border-b-2 ${
                  isActive(item.href)
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

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="lg:hidden bg-white border-t"
        >
          <div className="container-max py-4 space-y-3">
            {navigation.map((item) =>
              item.external ? (
                <a
                  key={item.href}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 px-4 text-base transition-colors border-b-2 border-transparent text-charcoal hover:text-primary hover:border-primary/40 focus-visible:outline-none focus-visible:border-primary"
                >
                  {item.name}
                </a>
              ) : (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block py-2 px-4 text-base transition-colors border-b-2 ${
                    isActive(item.href)
                      ? 'text-primary font-semibold border-primary'
                      : 'border-transparent text-charcoal hover:text-primary hover:border-primary/40 focus-visible:border-primary'
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
              className="block w-full bg-accent hover:bg-accent-strong text-light font-bold px-4 py-2 rounded-lg text-center transition-colors"
            >
              ❤️ 후원하기
            </a>
          </div>
        </motion.div>
      )}
    </header>
  );
}
