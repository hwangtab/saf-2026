import { readFileSync } from 'fs';
import path from 'path';
import { globSync } from 'glob';
import { isArtworkDetail, isHeroRoute } from '../../lib/hero-routes';

/**
 * 재발 방지용 정적 가드.
 *
 * Header는 `fixed top-0 h-16`(64px)이고 layout `<main>`은 상단 패딩이 없다. 따라서
 * PageHero가 없는 비-hero standalone 페이지는 루트에 헤더를 비우는 상단 패딩
 * (`HEADER_SAFE_TOP_PADDING`/`pt-20`+)을 직접 적용해야 한다. 빠뜨리면 콘텐츠가
 * 고정 헤더 아래로 가린다.
 *
 * 회귀 이력:
 *   - 2026-06-15: event success/fail/manage가 상단 패딩 누락 → 모바일에서 헤더에 가림.
 *
 * 이 테스트는 모든 비-hero 페이지(+ 같은 디렉터리·_components의 컴포넌트)가
 * PageHero 또는 헤더 클리어런스 패딩을 갖는지 검사한다.
 */

const APP_LOCALE_DIR = path.join(process.cwd(), 'app', '[locale]');

// hero가 아닌데도 의도적으로 상단 패딩을 두지 않는 페이지의 명시적 예외 목록.
// (현재 없음. 추가 시 반드시 사유를 주석으로 남길 것.)
const ALLOWLIST = new Set<string>([]);

// PageHero(헤더를 덮는 다크 hero) 또는 충분한 상단 클리어런스로 인정하는 토큰.
// pt-16(=64px, 헤더와 동일해 여백 0)은 클리어런스로 보지 않음 → pt-20(80px) 이상만.
const CLEARANCE_PATTERN =
  /PageHero|HEADER_SAFE_TOP_PADDING|\bpt-(?:2[0-9]|3[0-9]|[4-9][0-9])\b|\bpy-(?:2[0-9]|3[0-9]|[4-9][0-9])\b|\bpt-\[/;

function fileToRoute(relFromLocale: string): string {
  const dir = path.dirname(relFromLocale); // 'event/oh-yoon-memorial/success' | '.'
  if (dir === '.') return '/';
  return '/' + dir.split(path.sep).join('/');
}

/** 해당 페이지의 클리어런스 판정에 쓸 후보 소스(페이지 + 같은 디렉터리 + _components). */
function gatherSources(relFromLocale: string): string {
  const dirAbs = path.join(APP_LOCALE_DIR, path.dirname(relFromLocale));
  const candidates = [
    ...globSync('*.tsx', { cwd: dirAbs }).map((f) => path.join(dirAbs, f)),
    ...globSync('_components/**/*.tsx', { cwd: dirAbs }).map((f) => path.join(dirAbs, f)),
  ];
  return candidates.map((abs) => readFileSync(abs, 'utf8')).join('\n');
}

describe('비-hero standalone 페이지 헤더 클리어런스', () => {
  const pages = globSync('**/page.tsx', { cwd: APP_LOCALE_DIR });

  // sanity: 페이지를 실제로 스캔했는지 (glob 실패로 0건이면 테스트가 무의미)
  it('공개 페이지를 스캔했다', () => {
    expect(pages.length).toBeGreaterThan(10);
  });

  const nonHero = pages
    .map((rel) => ({ rel, route: fileToRoute(rel) }))
    .filter(({ route }) => !isHeroRoute(route) && !isArtworkDetail(route))
    .filter(({ route }) => !ALLOWLIST.has(route));

  it.each(nonHero.map(({ rel, route }) => [route, rel]))(
    '%s 는 PageHero 또는 헤더 클리어런스 패딩을 가진다',
    (_route, rel) => {
      const src = gatherSources(rel as string);
      expect(src).toMatch(CLEARANCE_PATTERN);
    }
  );
});
