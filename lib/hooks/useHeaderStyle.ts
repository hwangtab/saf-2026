import { useState, useCallback, useMemo, useEffect, useLayoutEffect } from 'react';
import { usePathname } from 'next/navigation';
import { HERO_PAGES } from '@/lib/constants';

const HEADER_SOLID_STYLE = 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';

type HeaderMode = 'transparent' | 'solid' | 'overlay';

function normalizePath(path: string): string {
  if (!path) return '/';
  const withoutTrailingSlash = path.replace(/\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
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

  const [heroAtTop, setHeroAtTop] = useState(false);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (isArtworkDetail) {
      return undefined;
    }

    let mounted = true;
    let attempts = 0;
    let frameId = 0;
    let observer: IntersectionObserver | null = null;
    let cleanupListeners: (() => void) | null = null;

    const selectRouteRoot = () => {
      if (!pathname) return document;
      const escapedPath = pathname.replace(/"/g, '\\"');
      const routeRoot = document.querySelector(`[data-route-path="${escapedPath}"]`);
      return routeRoot ?? document;
    };

    const selectSentinel = () =>
      selectRouteRoot().querySelector<HTMLElement>('[data-hero-sentinel="true"]');

    const updateFromRect = (target: HTMLElement) => {
      const next = target.getBoundingClientRect().top >= -1;
      setHeroAtTop((prev) => (prev !== next ? next : prev));
    };

    const attach = () => {
      const sentinel = selectSentinel();

      if (!mounted) return;

      if (!sentinel) {
        attempts += 1;
        if (attempts <= 12) {
          frameId = window.requestAnimationFrame(attach);
          return;
        }
        setResolvedPath(pathname || null);
        setHeroAtTop(false);
        return;
      }

      setResolvedPath(pathname || null);
      updateFromRect(sentinel);

      observer = new IntersectionObserver(
        (entries) => {
          const [entry] = entries;
          if (!entry) return;
          setHeroAtTop(entry.isIntersecting);
        },
        { threshold: [0, 1] }
      );
      observer.observe(sentinel);

      const sync = () => updateFromRect(sentinel);
      window.addEventListener('pageshow', sync);
      window.addEventListener('resize', sync);

      cleanupListeners = () => {
        window.removeEventListener('pageshow', sync);
        window.removeEventListener('resize', sync);
      };
    };

    attach();

    return () => {
      mounted = false;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
      }
      observer?.disconnect();
      cleanupListeners?.();
    };
  }, [pathname, isArtworkDetail]);

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

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
  const observerReady = resolvedPath === (pathname || null);

  const headerMode: HeaderMode = useMemo(() => {
    if (isMenuOpen) return 'overlay';
    if (isArtworkDetail) return 'solid';
    if (!mounted) return prefersHeroLayout ? 'transparent' : 'solid';
    if (!observerReady && prefersHeroLayout) return 'transparent';
    return heroAtTop ? 'transparent' : 'solid';
  }, [heroAtTop, isArtworkDetail, isMenuOpen, mounted, observerReady, prefersHeroLayout]);

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
