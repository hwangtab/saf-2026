import { useState, useCallback, useMemo, useEffect } from 'react';
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
  const isScrolled = useScrolled(50, isMenuOpen);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsTransitioning(true);
    const timer = setTimeout(() => setIsTransitioning(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

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
  // 모든 히어로 페이지의 히어로 섹션은 페이지 상단에 위치하므로 isScrolled만으로 판단 가능
  const headerStyle = useMemo(() => {
    if (isArtworkDetail || !hasHero) {
      return 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
    }

    // 마운트 전(SSR/초기 렌더링)이거나, 페이지 전환 중이거나, 스크롤되지 않았으면 투명하게 처리
    // 이는 서버 사이드 렌더링 시 초기 상태를 '투명'으로 강제하여 하이드레이션 불일치를 방지하고,
    // 페이지 전환 시 스크롤 복원 등으로 인한 깜빡임을 방지함
    if (!mounted || isTransitioning || !isScrolled) {
      return 'bg-transparent';
    }

    return 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
  }, [isArtworkDetail, hasHero, isScrolled, mounted, isTransitioning]);

  const isDarkText = !hasHero || isArtworkDetail || isScrolled;
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
