const PROTECTED_SURFACE_PREFIXES = ['/admin', '/dashboard', '/exhibitor'] as const;
const PORTAL_SURFACE_PREFIXES = [...PROTECTED_SURFACE_PREFIXES, '/onboarding', '/mypage'] as const;
const FOOTER_SLIDER_EXCLUDE_PATHS = new Set(['/', '/artworks']);
const FOOTER_SLIDER_EXCLUDE_PREFIXES = PORTAL_SURFACE_PREFIXES;

/**
 * next-intl middleware는 `/` ↔ `/ko` ↔ `/en`을 internal rewrite로 연결합니다.
 * server component의 internal path는 `/ko/foo`인 반면 client component의 `usePathname()`은
 * browser URL `/foo` 또는 `/ko/foo`를 그대로 반환해 양쪽이 mismatch될 수 있습니다.
 * 이 mismatch가 React error #418 (hydration HTML mismatch)의 원인 — locale prefix를
 * 일괄 strip해서 비교에 일관성을 줍니다.
 */
export function stripLocale(pathname: string): string {
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

/**
 * 결제 입력 페이지(`/checkout` 장바구니, `/checkout/{id}` 단건·해외)에서는 사이트 Footer
 * (출품작 캐러셀 + 풀 푸터)를 숨겨 결제 집중을 유지한다. 판매자 정보·약관은 결제 페이지
 * 내부 CheckoutTrustNotice가 이미 노출하므로 중복도 제거된다.
 * 결제 완료/실패(`/checkout/{id}/success|fail`)는 다음 행동 유도를 위해 Footer를 유지 —
 * `/^\/checkout\/[^/]+$/`가 하위 세그먼트(success/fail)를 자연 제외한다.
 */
export function shouldHideSiteFooter(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  const normalized = stripLocale(pathname);
  return normalized === '/checkout' || /^\/checkout\/[^/]+$/.test(normalized);
}
