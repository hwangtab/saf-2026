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

import type { Story } from '@/types';

export const ARTIST_PRIMARY_STORY: Record<string, string> = {
  김주호: 'meet-artist-kim-ju-ho',
  오윤: 'oh-yun-40th-anniversary',
  이호철: 'meet-artist-lee-ho-chul',
  최윤정: 'meet-artist-choi-yun-jung',
  민정기: 'meet-artist-min-jeonggi',
  이철수: 'lee-cheol-soo-artist-guide',
};

/** 작가명으로 정전 스토리 slug 조회. 미등재 작가는 null. */
export function getPrimaryStorySlug(artistName: string): string | null {
  return ARTIST_PRIMARY_STORY[artistName] ?? null;
}

/**
 * pool에서 정전 스토리를 맨 앞으로 끌어올림(중복 제거).
 * 미등재 작가 또는 정전 스토리가 pool에 없으면 pool 그대로 반환 → 회귀 0.
 */
export function pinPrimaryStory(artistName: string, pool: readonly Story[]): Story[] {
  const slug = getPrimaryStorySlug(artistName);
  if (!slug) return [...pool];
  const primary = pool.find((s) => s.slug === slug);
  if (!primary) return [...pool];
  return [primary, ...pool.filter((s) => s.slug !== slug)];
}
