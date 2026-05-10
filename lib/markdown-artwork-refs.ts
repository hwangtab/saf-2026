/**
 * 매거진 마크다운 본문에서 직접 인용된 작품 id를 추출.
 *
 * 매거진 글은 본문에 [작품 페이지 →](/artworks/{uuid}) 또는 [...](en/artworks/{uuid}) 형식으로
 * 작품을 인용하는 컨벤션을 따른다. 이 헬퍼는 그 패턴을 검출해 작품 uuid 목록을 반환.
 *
 * 매칭 경계 조건:
 * - `/artworks/{uuid}` 또는 `/en/artworks/{uuid}` 모두 인식
 * - 뒤따르는 문자가 ), ", 공백, 또는 문자열 끝일 때만 매칭 — Supabase Storage URL의
 *   `/artworks/{artist-id}/...` 구조의 artist-id가 잡히지 않도록 경계 제약
 * - 중복 제거, 등장 순서 유지
 *
 * 활용처:
 * - stories/[slug]/page.tsx: 본문 인용 작품을 "관련 작품"으로 표시 + BlogPosting mentions
 * - artworks/artist/[artist]/page.tsx: 이 작가의 작품을 인용한 매거진 글 역참조
 */

const ARTWORK_REF_RE =
  /\/(?:en\/)?artworks\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})(?=[)"\s]|$)/gi;

/** 본문 마크다운에서 인용된 작품 uuid 추출 (중복 제거, 등장 순서 유지) */
export function extractArtworkIdsFromBody(body: string | null | undefined): string[] {
  if (!body) return [];
  const seen = new Set<string>();
  const ordered: string[] = [];
  for (const match of body.matchAll(ARTWORK_REF_RE)) {
    const id = match[1].toLowerCase();
    if (!seen.has(id)) {
      seen.add(id);
      ordered.push(id);
    }
  }
  return ordered;
}
