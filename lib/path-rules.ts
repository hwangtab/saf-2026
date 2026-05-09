const PROTECTED_SURFACE_PREFIXES = ['/admin', '/dashboard', '/exhibitor'] as const;
const PORTAL_SURFACE_PREFIXES = [...PROTECTED_SURFACE_PREFIXES, '/onboarding'] as const;
const FOOTER_SLIDER_EXCLUDE_PATHS = new Set(['/', '/artworks']);
const FOOTER_SLIDER_EXCLUDE_PREFIXES = PORTAL_SURFACE_PREFIXES;

/**
 * next-intl middleware는 `/` ↔ `/ko` ↔ `/en`을 internal rewrite로 연결합니다.
 * server component의 internal path는 `/ko/foo`인 반면 client component의 `usePathname()`은
 * browser URL `/foo` 또는 `/ko/foo`를 그대로 반환해 양쪽이 mismatch될 수 있습니다.
 * 이 mismatch가 React error #418 (hydration HTML mismatch)의 원인 — locale prefix를
 * 일괄 strip해서 비교에 일관성을 줍니다.
 */
function stripLocale(pathname: string): string {
  const m = pathname.match(/^\/(ko|en)(?=\/|$)/);
  if (!m) return pathname;
  const rest = pathname.slice(m[0].length);
  return rest || '/';
}

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
  if (!pathname) return false;
  return hasPrefix(stripLocale(pathname), PROTECTED_SURFACE_PREFIXES);
}

export function shouldShowFooterSlider(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = stripLocale(pathname);
  if (FOOTER_SLIDER_EXCLUDE_PATHS.has(normalized)) return false;
  return !hasPrefix(normalized, FOOTER_SLIDER_EXCLUDE_PREFIXES);
}
