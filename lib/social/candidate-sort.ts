// 게시 후보 정렬 — 신선도 우선 큐레이션 규칙(순수 함수, 테스트 용이).

export interface SortableCandidate {
  postCount: number;
  lastPublishedAt: string | null;
  createdAt: string | null;
}

/**
 * 정렬 우선순위:
 * 1) 미게시(postCount===0) 먼저
 * 2) 미게시끼리는 신착순(createdAt 내림차순)
 * 3) 게시 이력 있는 것끼리는 가장 오래전 게시순(lastPublishedAt 오름차순) — 다시 노출할 만한 것 우선
 *
 * 원본 배열을 변경하지 않고 정렬된 복사본을 반환.
 */
export function sortCandidatesForPublishing<T extends SortableCandidate>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    if (a.postCount === 0 && b.postCount === 0) {
      return (b.createdAt ?? '').localeCompare(a.createdAt ?? '');
    }
    if (a.postCount === 0) return -1;
    if (b.postCount === 0) return 1;
    return (a.lastPublishedAt ?? '').localeCompare(b.lastPublishedAt ?? '');
  });
}
