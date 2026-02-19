import { useState, useCallback, useMemo, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HERO_PAGES } from '@/lib/constants';

const HEADER_SOLID_STYLE = 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
const HERO_SCROLL_TOP_THRESHOLD = 8;

type HeaderMode = 'transparent' | 'solid' | 'overlay';

function normalizePath(path: string): string {
  if (!path) return '/';
  let normalized = path.trim();

  normalized = normalized.replace(/\/+$/, '');

  if (normalized === '' || normalized === '/index' || normalized === '/index.html') {
    return '/';
  }

  if (normalized.endsWith('/index')) {
    normalized = normalized.slice(0, -'/index'.length);
  } else if (normalized.endsWith('/index.html')) {
    normalized = normalized.slice(0, -'/index.html'.length);
  }

  return normalized === '' ? '/' : normalized;
}

export function useHeaderStyle() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || '/');

  // 경로 기반 파생 상태 메모이제이션
  const { isArtworkDetail, prefersHeroLayout } = useMemo(() => {
    const artistPage = currentPath.startsWith('/artworks/artist/');
    const specialHeroPage = currentPath === '/special/oh-yoon';
    const artworkDetail =
      currentPath.startsWith('/artworks/') && currentPath !== '/artworks' && !artistPage;
    const heroPage =
      (HERO_PAGES.includes(currentPath as (typeof HERO_PAGES)[number]) && !artworkDetail) ||
      artistPage ||
      specialHeroPage;
    return { isArtworkDetail: artworkDetail, prefersHeroLayout: heroPage };
  }, [currentPath]);

  // Hero routes should render transparent at top by default.
  const [heroAtTop, setHeroAtTop] = useState(true);

  useLayoutEffect(() => {
    if (isArtworkDetail || !prefersHeroLayout) {
      return undefined;
    }

    let rafId = 0;

    const updateFromScroll = () => {
      const next = window.scrollY <= HERO_SCROLL_TOP_THRESHOLD;
      setHeroAtTop((prev) => (prev !== next ? next : prev));
      rafId = 0;
    };

    const requestSync = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(updateFromScroll);
    };

    updateFromScroll();
    window.addEventListener('scroll', requestSync, { passive: true });
    window.addEventListener('resize', requestSync);
    window.addEventListener('pageshow', requestSync);

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
      window.removeEventListener('scroll', requestSync);
      window.removeEventListener('resize', requestSync);
      window.removeEventListener('pageshow', requestSync);
    };
  }, [pathname, isArtworkDetail, prefersHeroLayout]);

  const isActive = useCallback(
    (href: string) => {
      if (href === '/' && currentPath === '/') return true;
      if (href !== '/' && currentPath.startsWith(href)) return true;
      return false;
    },
    [currentPath]
  );

  const openMenu = useCallback(() => setIsMenuOpen(true), []);
  const closeMenu = useCallback(() => setIsMenuOpen(false), []);

  const headerMode: HeaderMode = useMemo(() => {
    if (isMenuOpen) return 'overlay';
    if (isArtworkDetail) return 'solid';
    if (!prefersHeroLayout) return 'solid';
    return heroAtTop ? 'transparent' : 'solid';
  }, [heroAtTop, isArtworkDetail, isMenuOpen, prefersHeroLayout]);

  const headerStyle = headerMode === 'transparent' ? 'bg-transparent' : HEADER_SOLID_STYLE;

  const isDarkText = headerMode !== 'transparent';
  const textColor = isDarkText ? 'text-charcoal' : 'text-white';

  return {
    isMenuOpen,
    openMenu,
    closeMenu,
    isActive,
    headerStyle,
    isDarkText,
    textColor,
  };
}
