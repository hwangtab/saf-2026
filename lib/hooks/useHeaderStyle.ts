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
  const [observedPath, setObservedPath] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (isArtworkDetail || !prefersHeroLayout) {
      return undefined;
    }

    let mounted = true;
    let observer: IntersectionObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let observedSentinel: HTMLElement | null = null;
    let cleanupListeners: (() => void) | null = null;

    const selectRouteRoot = () => {
      if (!pathname) return document as ParentNode;
      const escapedPath = pathname.replace(/"/g, '\\"');
      return document.querySelector(`[data-route-path="${escapedPath}"]`) as ParentNode | null;
    };

    const selectSentinel = () =>
      selectRouteRoot()?.querySelector<HTMLElement>('[data-hero-sentinel="true"]') ?? null;

    const updateFromRect = (target: HTMLElement) => {
      const next = target.getBoundingClientRect().top >= -1;
      setHeroAtTop((prev) => (prev !== next ? next : prev));
    };

    const attach = () => {
      const sentinel = selectSentinel();

      if (!mounted || !sentinel) {
        return false;
      }

      if (observedSentinel === sentinel) {
        updateFromRect(sentinel);
        return true;
      }

      observedSentinel = sentinel;
      setObservedPath(pathname || null);
      updateFromRect(sentinel);

      observer?.disconnect();

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

      return true;
    };

    if (!attach()) {
      const observeTarget =
        (document.getElementById('main-content') as ParentNode | null) ?? document.body;

      mutationObserver = new MutationObserver(() => {
        if (attach()) {
          mutationObserver?.disconnect();
        }
      });

      mutationObserver.observe(observeTarget, {
        childList: true,
        subtree: true,
      });
    }

    return () => {
      mounted = false;
      observer?.disconnect();
      mutationObserver?.disconnect();
      cleanupListeners?.();
    };
  }, [pathname, isArtworkDetail, prefersHeroLayout]);

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
  const observerReady = observedPath === (pathname || null);

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
