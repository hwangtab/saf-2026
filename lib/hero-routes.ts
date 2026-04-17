/**
 * Header 투명/불투명 판정의 단일 출처.
 *
 * 배경: 과거에 `/stories`, `/transparency`, `/terms-consent` 세 건의 헤더 투명화 버그가 반복
 * 발생했습니다 (changelog 2026-03-18, 2026-04-07, 2026-04-17). 원인은 두 종류:
 *   (1) 신규 페이지 추가 시 HERO_PAGES 등록 누락
 *   (2) `pathname.startsWith('/foo')`가 `/foo-bar` 같은 형제 경로까지 매칭
 *
 * 이 모듈은 두 문제를 구조적으로 차단합니다:
 *   - Hero 경로 선언이 이 파일 한 곳에만 존재 → 추가/삭제를 여기만 건드리면 됨
 *   - {@link EndsWithSlash} 타입으로 접두어에 `/` 종결을 **컴파일 타임에 강제**
 */

/** 슬래시로 끝나는 문자열만 허용하는 브랜드 타입. */
type Slashed = `${string}/`;

/**
 * 정확히 일치할 때만 hero 레이아웃으로 간주할 경로 목록.
 * 새 hero 페이지가 목록 최상위(또는 단일 페이지) 형태면 여기에 추가.
 */
const HERO_EXACT = new Set<string>([
  '/',
  '/about',
  '/our-reality',
  '/our-proof',
  '/transparency',
  '/archive',
  '/archive/2023',
  '/archive/2026',
  '/news',
  '/artworks',
  '/stories',
  '/privacy',
  '/terms',
]);

/**
 * 하위 경로까지 hero 레이아웃으로 간주할 접두어 목록.
 *
 * **반드시 `/`로 끝나야 합니다.** `Slashed` 타입이 이를 컴파일 타임에 강제합니다.
 * 예) `'/terms'`는 타입 에러 → `'/terms/'`로 작성. `/terms-consent`가 오매칭되지 않음.
 */
const HERO_PREFIXES = [
  '/artworks/artist/',
  '/artworks/category/',
  '/stories/',
  '/news/',
  '/terms/',
] as const satisfies readonly Slashed[];

/**
 * 작품 상세(`/artworks/[id]`)는 hero 레이아웃 대상이 아님 (전용 상세 레이아웃 사용).
 * artist/category 서브섹션은 제외.
 */
export function isArtworkDetail(pathname: string): boolean {
  if (!pathname.startsWith('/artworks/')) return false;
  if (pathname === '/artworks') return false;
  if (pathname.startsWith('/artworks/artist/')) return false;
  if (pathname.startsWith('/artworks/category/')) return false;
  return true;
}

/** 주어진 pathname이 hero 레이아웃(상단 투명 헤더) 대상인지 판정. */
export function isHeroRoute(pathname: string): boolean {
  if (isArtworkDetail(pathname)) return false;
  if (HERO_EXACT.has(pathname)) return true;
  return HERO_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/** 외부에서 참조해야 할 때를 위한 읽기 전용 export (테스트·문서용). */
export const HERO_ROUTES = {
  exact: HERO_EXACT as ReadonlySet<string>,
  prefixes: HERO_PREFIXES,
} as const;
