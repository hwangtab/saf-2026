import { useState, useCallback, useEffect, useMemo, useLayoutEffect } from 'react';
import { usePathname } from '@/i18n/navigation';
import { isArtworkDetail, isHeroRoute } from '@/lib/hero-routes';

const HEADER_SOLID_STYLE = 'bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50';
const HERO_SCROLL_TOP_THRESHOLD = 8;
// 라우트 전환 직후 헤더를 solid로 lock해 hero 라우트 진입 시 흰글씨가
// 연노란 body bg에 떠서 안 보이는 짧은 깜빡임을 차단. 새 페이지 RSC mount 시간 정도.
const TRANSITION_LOCK_MS = 250;

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

  // 경로 기반 파생 상태 — 규칙은 lib/hero-routes.ts 단일 출처
  const { artworkDetail, prefersHeroLayout } = useMemo(
    () => ({
      artworkDetail: isArtworkDetail(currentPath),
      prefersHeroLayout: isHeroRoute(currentPath),
    }),
    [currentPath]
  );

  // Hero routes should render transparent at top by default.
  const [heroAtTop, setHeroAtTop] = useState(true);

  // 라우트 전환 lock — pathname 변경 시 짧게 solid 유지.
  // React가 권장하는 "previous prop을 state로 저장하는 패턴"으로 effect 안 setState
  // 및 render 중 ref 접근 lint 룰을 모두 우회. 첫 mount는 prevPathname === pathname이라
  // 자동으로 lock이 켜지지 않음.
  const [transitionLock, setTransitionLock] = useState(false);
  const [prevPathname, setPrevPathname] = useState(pathname);

  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    if (!transitionLock) {
      setTransitionLock(true);
    }
  }

  useEffect(() => {
    if (!transitionLock) return;
    const id = window.setTimeout(() => setTransitionLock(false), TRANSITION_LOCK_MS);
    return () => window.clearTimeout(id);
  }, [transitionLock]);

  useLayoutEffect(() => {
    if (artworkDetail || !prefersHeroLayout) {
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
  }, [pathname, artworkDetail, prefersHeroLayout]);

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
    if (transitionLock) return 'solid';
    if (artworkDetail) return 'solid';
    if (!prefersHeroLayout) return 'solid';
    return heroAtTop ? 'transparent' : 'solid';
  }, [heroAtTop, artworkDetail, isMenuOpen, prefersHeroLayout, transitionLock]);

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
