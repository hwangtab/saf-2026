import { sortCandidatesForPublishing } from '@/lib/social/candidate-sort';

interface C {
  id: string;
  postCount: number;
  lastPublishedAt: string | null;
  createdAt: string | null;
}

const ids = (items: C[]) => items.map((c) => c.id);

describe('sortCandidatesForPublishing', () => {
  it('미게시(postCount 0)를 게시된 것보다 먼저 둔다', () => {
    const input: C[] = [
      { id: 'posted', postCount: 2, lastPublishedAt: '2026-06-01', createdAt: '2026-01-01' },
      { id: 'fresh', postCount: 0, lastPublishedAt: null, createdAt: '2026-01-01' },
    ];
    expect(ids(sortCandidatesForPublishing(input))).toEqual(['fresh', 'posted']);
  });

  it('미게시끼리는 신착(createdAt 내림차순) 순', () => {
    const input: C[] = [
      { id: 'old', postCount: 0, lastPublishedAt: null, createdAt: '2026-01-01' },
      { id: 'new', postCount: 0, lastPublishedAt: null, createdAt: '2026-06-01' },
    ];
    expect(ids(sortCandidatesForPublishing(input))).toEqual(['new', 'old']);
  });

  it('게시 이력 있는 것끼리는 가장 오래전 게시(lastPublishedAt 오름차순)가 먼저', () => {
    const input: C[] = [
      { id: 'recent', postCount: 1, lastPublishedAt: '2026-06-10', createdAt: '2026-01-01' },
      { id: 'stale', postCount: 1, lastPublishedAt: '2026-03-01', createdAt: '2026-01-01' },
    ];
    expect(ids(sortCandidatesForPublishing(input))).toEqual(['stale', 'recent']);
  });

  it('종합 순서: 미게시(신착) → 미게시(구착) → 오래전 게시 → 최근 게시', () => {
    const input: C[] = [
      { id: 'posted-recent', postCount: 3, lastPublishedAt: '2026-06-10', createdAt: '2026-02-01' },
      { id: 'unposted-new', postCount: 0, lastPublishedAt: null, createdAt: '2026-06-01' },
      { id: 'posted-stale', postCount: 1, lastPublishedAt: '2026-01-15', createdAt: '2026-02-01' },
      { id: 'unposted-old', postCount: 0, lastPublishedAt: null, createdAt: '2026-01-01' },
    ];
    expect(ids(sortCandidatesForPublishing(input))).toEqual([
      'unposted-new',
      'unposted-old',
      'posted-stale',
      'posted-recent',
    ]);
  });

  it('원본 배열을 변경하지 않는다', () => {
    const input: C[] = [
      { id: 'a', postCount: 1, lastPublishedAt: '2026-06-10', createdAt: '2026-01-01' },
      { id: 'b', postCount: 0, lastPublishedAt: null, createdAt: '2026-01-01' },
    ];
    const before = ids(input);
    sortCandidatesForPublishing(input);
    expect(ids(input)).toEqual(before);
  });
});
