/**
 * 작가 이름(name_ko) → 정전(canonical) biographical 스토리 slug 명시 맵.
 *
 * 배경: "{작가} 작가" navigational 쿼리에서 gallery·story·artwork detail이 경쟁해
 * link equity가 4~12개 페이지로 분산됨 — GSC 28일 분석(2026-05-20):
 *   김주호 4 페이지 / 오윤 12 페이지. canonical 스토리가 pos 8~9에 정체.
 *
 * gallery 페이지의 heuristic tag-match는 recency 순 `.slice(0,3)`이라 정전 스토리가
 * 최신 큐레이션 글에 밀릴 수 있음. 이 맵으로 pinPrimaryStory가 결정론적으로 앞에 올림.
 *
 * GSC imp≥10 작가만 등재 (데이터 기반 scope). 모든 slug은 Supabase stories SELECT로 실재 확인.
 */

export const ARTIST_PRIMARY_STORY: Record<string, string> = {
  // ─── 초기 등재 (GSC 집중 분석 기반) ────────────────────────────────────────
  김주호: 'meet-artist-kim-ju-ho',
  오윤: 'oh-yun-40th-anniversary',
  이호철: 'meet-artist-lee-ho-chul',
  최윤정: 'meet-artist-choi-yun-jung',
  민정기: 'meet-artist-min-jeonggi',
  이철수: 'lee-cheol-soo-artist-guide',

  // ─── GSC 2026-04-19~05-16: T2-5 0-click 작가 ────────────────────────────
  // artist-seo-overrides.ts T2-5 그룹(합계 ~342 imp / 0 click) 중 artist-story 보유 작가.
  조문호: 'meet-artist-cho-moon-ho',
  박불똥: 'meet-artist-park-bul-ttong',
  윤겸: 'meet-artist-yoon-gyeom',
  신연진: 'meet-artist-sin-yeonjin',
  박성완: 'meet-artist-park-seongwan',
  김수오: 'meet-artist-kim-suoh',
  이은화: 'meet-artist-lee-eun-hwa',
  양순열: 'meet-artist-yang-sunyeol',
  천지수: 'meet-artist-cheon-jisu',
  이문형: 'meet-artist-lee-munhyeong',
  박재동: 'park-jae-dong-artist-guide', // 2개 스토리 중 장문 프로필 guide 채택
  이홍원: 'meet-artist-lee-hongwon',

  // ─── GSC 2026-04-19~05-16: T2-6 추가 ────────────────────────────────────
  김준권: 'meet-artist-kim-jun-kwon',
  정금희: 'meet-artist-jeong-geumhui',

  // ─── GSC 2026-04-22~05-20: T2-8 잔여 ────────────────────────────────────
  손은영: 'meet-artist-son-eunyeong',
  주재환: 'joo-jaehwan-art-and-life',
  최혜수: 'meet-artist-choe-hyesu',
  강석태: 'kang-seoktae-little-prince',

  // ─── GSC 2026-04-19~05-17: T2-13 미커버 ─────────────────────────────────
  박소형: 'meet-artist-park-sohyeong',

  // ─── GSC 2026-05-27: T2 잔여 gap-fill ───────────────────────────────────
  정영신: 'meet-artist-jung-young-shin',
};

/** 작가명으로 정전 스토리 slug 조회. 미등재 작가는 null. */
export function getPrimaryStorySlug(artistName: string): string | null {
  return ARTIST_PRIMARY_STORY[artistName] ?? null;
}

/**
 * pool에서 정전 스토리를 맨 앞으로 끌어올림(중복 제거).
 * 미등재 작가 또는 정전 스토리가 pool에 없으면 pool 그대로 반환 → 회귀 0.
 * generic T로 Story/StoryLight 등 slug 보유 형태 모두 수용.
 */
export function pinPrimaryStory<T extends { slug: string }>(
  artistName: string,
  pool: readonly T[]
): T[] {
  const slug = getPrimaryStorySlug(artistName);
  if (!slug) return [...pool];
  const primary = pool.find((s) => s.slug === slug);
  if (!primary) return [...pool];
  return [primary, ...pool.filter((s) => s.slug !== slug)];
}
