const PROTECTED_SURFACE_PREFIXES = ['/admin', '/dashboard', '/exhibitor'] as const;
const PORTAL_SURFACE_PREFIXES = [...PROTECTED_SURFACE_PREFIXES, '/onboarding'] as const;
const FOOTER_SLIDER_EXCLUDE_PATHS = new Set(['/', '/artworks']);
const FOOTER_SLIDER_EXCLUDE_PREFIXES = PORTAL_SURFACE_PREFIXES;

/**
 * `pathname`이 `surface` 자체거나 그 하위 경로인지 판정.
 * `/admin`은 `/admin` 또는 `/admin/...`만 매칭하고 `/admin-foo` 같은 형제 경로는 차단.
 * middleware·라우팅 로직에서 `pathname.startsWith(surface)` 직접 사용 금지 — 이 헬퍼 사용.
 */
export function belongsToSurface(pathname: string, surface: string): boolean {
  return pathname === surface || pathname.startsWith(surface + '/');
}

function hasPrefix(pathname: string | null | undefined, prefixes: readonly string[]): boolean {
  if (!pathname) return false;
  return prefixes.some((prefix) => belongsToSurface(pathname, prefix));
}

export function isProtectedSurfacePath(pathname: string | null | undefined): boolean {
  return hasPrefix(pathname, PROTECTED_SURFACE_PREFIXES);
}

export function shouldShowFooterSlider(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (FOOTER_SLIDER_EXCLUDE_PATHS.has(pathname)) return false;
  return !hasPrefix(pathname, FOOTER_SLIDER_EXCLUDE_PREFIXES);
}
