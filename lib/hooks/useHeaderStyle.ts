import { useState, useCallback, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { HERO_PAGES } from '@/lib/constants';
import { useScrolled } from '@/lib/hooks/useScrolled';

function normalizePath(path: string): string {
  if (!path) return '/';
  const withoutTrailingSlash = path.replace(/\/+$/, '');
  return withoutTrailingSlash === '' ? '/' : withoutTrailingSlash;
}

export function useHeaderStyle() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 네이티브 <dialog>가 스크롤 잠금을 처리하므로 useScrollLock 불필요
  const isScrolled = useScrolled(10, isMenuOpen);
  const pathname = usePathname();
  const currentPath = normalizePath(pathname || '/');

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

  // 헤더 스타일 메모이제이션 (메뉴가 풀스크린이므로 isMenuVisible 조건 제거)
  const headerStyle = useMemo(() => {
    if (isArtworkDetail || isScrolled || !hasHero) {
      return 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
    }
    return 'bg-transparent';
  }, [isArtworkDetail, isScrolled, hasHero]);

  const isDarkText = isScrolled || !hasHero || isArtworkDetail;
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
