const PROTECTED_SURFACE_PREFIXES = ['/admin', '/dashboard', '/exhibitor'] as const;
const HEADER_HIDDEN_PREFIXES = [...PROTECTED_SURFACE_PREFIXES, '/onboarding'] as const;
const FOOTER_SLIDER_EXCLUDE_PATHS = new Set(['/', '/artworks']);
const FOOTER_SLIDER_EXCLUDE_PREFIXES = HEADER_HIDDEN_PREFIXES;

function hasPrefix(pathname: string | null | undefined, prefixes: readonly string[]): boolean {
  if (!pathname) return false;
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export function isProtectedSurfacePath(pathname: string | null | undefined): boolean {
  return hasPrefix(pathname, PROTECTED_SURFACE_PREFIXES);
}

export function shouldHidePublicHeader(pathname: string | null | undefined): boolean {
  return hasPrefix(pathname, HEADER_HIDDEN_PREFIXES);
}

export function shouldShowFooterSlider(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (FOOTER_SLIDER_EXCLUDE_PATHS.has(pathname)) return false;
  return !hasPrefix(pathname, FOOTER_SLIDER_EXCLUDE_PREFIXES);
}
