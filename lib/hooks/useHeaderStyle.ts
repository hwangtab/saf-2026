import { useState, useCallback, useEffect, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { HERO_PAGES } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';

function normalizePath(path: string): string {
  if (!path) return '/';
  const withoutTrailingSlash = path.replace(/\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
}

function useHeroAtTop(currentPath: string, hasHero: boolean, disabled: boolean): boolean {
  const [heroVisibilityByPath, setHeroVisibilityByPath] = useState<Record<string, boolean>>({});

  const heroAtTop = hasHero ? (heroVisibilityByPath[currentPath] ?? true) : false;

  useEffect(() => {
    if (!hasHero || disabled) return undefined;

    const publish = (nextValue: boolean) => {
      setHeroVisibilityByPath((prev) => {
        if (prev[currentPath] === nextValue) {
          return prev;
        }
        return {
          ...prev,
          [currentPath]: nextValue,
        };
      });
    };

    const evaluateByScroll = () => {
      publish(window.scrollY <= 10);
    };

    const sentinel = document.querySelector<HTMLElement>('[data-hero-sentinel="true"]');
    let observer: IntersectionObserver | null = null;
    let rafId: number | null = null;

    if (sentinel) {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          publish(Boolean(entry?.isIntersecting));
        },
        {
          root: null,
          threshold: 0,
          rootMargin: '-64px 0px 0px 0px',
        }
      );
      observer.observe(sentinel);
    } else {
      window.addEventListener('scroll', evaluateByScroll, { passive: true });
      window.addEventListener('resize', evaluateByScroll);
      window.addEventListener('pageshow', evaluateByScroll);
      window.addEventListener('popstate', evaluateByScroll);
      rafId = window.requestAnimationFrame(evaluateByScroll);
    }

    return () => {
      observer?.disconnect();
      if (!sentinel) {
        window.removeEventListener('scroll', evaluateByScroll);
        window.removeEventListener('resize', evaluateByScroll);
        window.removeEventListener('pageshow', evaluateByScroll);
        window.removeEventListener('popstate', evaluateByScroll);
      }
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [currentPath, hasHero, disabled]);

  return heroAtTop;
}

export function useHeaderStyle() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || '/');

  // 경로 기반 파생 상태 메모이제이션
  const { isArtworkDetail, hasHero } = useMemo(() => {
    const artistPage = currentPath.startsWith('/artworks/artist/');
    const specialHeroPage = currentPath === '/special/oh-yoon';
    const artworkDetail =
      currentPath.startsWith('/artworks/') && currentPath !== '/artworks' && !artistPage;
    const heroPage =
      (HERO_PAGES.includes(currentPath as (typeof HERO_PAGES)[number]) && !artworkDetail) ||
      artistPage ||
      specialHeroPage;
    return { isArtworkDetail: artworkDetail, hasHero: heroPage };
  }, [currentPath]);

  // 네이티브 <dialog>가 스크롤 잠금을 처리하므로 useScrollLock 불필요
  const isScrolled = useScrolled(10, isMenuOpen);
  const isHeroAtTop = useHeroAtTop(currentPath, hasHero, isMenuOpen);

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

  // 헤더 스타일 메모이제이션 (메뉴가 풀스크린이므로 isMenuVisible 조건 제거)
  const headerStyle = useMemo(() => {
    if (isArtworkDetail || !hasHero) {
      return 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
    }
    return isHeroAtTop
      ? 'bg-transparent'
      : 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
  }, [isArtworkDetail, hasHero, isHeroAtTop]);

  const isDarkText = !hasHero || isArtworkDetail || !isHeroAtTop || isScrolled;
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
