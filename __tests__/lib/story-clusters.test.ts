import { selectRelatedStories, STORY_CLUSTERS } from '../../lib/story-clusters';
import type { Story } from '../../types';

function s(slug: string, category: Story['category'] = 'art-knowledge'): Story {
  return {
    id: 'id-' + slug,
    slug,
    title: slug,
    title_en: undefined,
    category,
    excerpt: '',
    excerpt_en: undefined,
    body: '',
    body_en: undefined,
    thumbnail: undefined,
    author: undefined,
    published_at: '2026-01-01',
    updated_at: undefined,
    is_published: true,
    display_order: 0,
    tags: undefined,
  };
}

describe('STORY_CLUSTERS', () => {
  it('editions-prints 클러스터에 editions-explained 포함', () => {
    expect(STORY_CLUSTERS['editions-prints']).toContain('editions-explained');
  });

  it('sizes-and-mediums 클러스터에 reading-art-sizes-ho-vs-cm 포함', () => {
    expect(STORY_CLUSTERS['sizes-and-mediums']).toContain('reading-art-sizes-ho-vs-cm');
  });

  it('한 slug이 두 클러스터에 중복 소속되지 않는다', () => {
    const allSlugs = Object.values(STORY_CLUSTERS).flat();
    const unique = new Set(allSlugs);
    expect(unique.size).toBe(allSlugs.length);
  });
});

describe('selectRelatedStories', () => {
  const clusterSlugs = STORY_CLUSTERS['editions-prints'] as readonly string[];
  const pool = [
    // editions-prints cluster members (art-knowledge + buying-guide)
    s('editions-explained', 'buying-guide'),
    s('world-of-printmaking', 'art-knowledge'),
    s('prints-vs-originals-and-edition-numbers', 'art-knowledge'),
    s('archival-pigment-print-photography', 'art-knowledge'),
    s('print-vs-original-price-economics', 'buying-guide'),
    // 같은 category non-cluster stories
    s('random-art-knowledge-1', 'art-knowledge'),
    s('random-art-knowledge-2', 'art-knowledge'),
    s('random-buying-guide-1', 'buying-guide'),
  ];

  it('editions-explained → cluster 형제가 우선 3개 반환', () => {
    const result = selectRelatedStories('editions-explained', 'buying-guide', pool, 3);
    const slugs = result.map((r) => r.slug);
    // cluster 순서: world-of-printmaking, prints-vs-originals-and-edition-numbers, archival-pigment-print-photography
    expect(slugs[0]).toBe('world-of-printmaking');
    expect(slugs[1]).toBe('prints-vs-originals-and-edition-numbers');
    expect(slugs[2]).toBe('archival-pigment-print-photography');
  });

  it('cluster 형제 부족 시 같은 category fallback으로 채움', () => {
    // pool에서 cluster member 3개만 남김
    const smallPool = [
      s('editions-explained', 'buying-guide'),
      s('print-vs-original-price-economics', 'buying-guide'),
      s('random-buying-guide-1', 'buying-guide'),
    ];
    const result = selectRelatedStories('editions-explained', 'buying-guide', smallPool, 3);
    const slugs = result.map((r) => r.slug);
    expect(slugs).toContain('print-vs-original-price-economics'); // cluster member
    expect(slugs).toContain('random-buying-guide-1'); // category fallback
    expect(slugs).not.toContain('editions-explained'); // current 제외
    expect(result.length).toBe(2); // pool에 2개밖에 없음
  });

  it('클러스터 미소속 글은 category fallback만 적용', () => {
    const nonClusterPool = [
      s('how-mutual-aid-fund-works', 'art-knowledge'),
      s('art-care-and-maintenance', 'art-knowledge'),
      s('random-art-knowledge-1', 'art-knowledge'),
      s('random-art-knowledge-2', 'art-knowledge'),
    ];
    const result = selectRelatedStories(
      'how-mutual-aid-fund-works',
      'art-knowledge',
      nonClusterPool,
      3
    );
    expect(result.length).toBe(3);
    expect(result.map((r) => r.slug)).not.toContain('how-mutual-aid-fund-works');
    // 모두 art-knowledge여야 함
    expect(result.every((r) => r.category === 'art-knowledge')).toBe(true);
  });

  it('현재 글은 결과에 포함되지 않는다', () => {
    const result = selectRelatedStories('world-of-printmaking', 'art-knowledge', pool, 3);
    expect(result.map((r) => r.slug)).not.toContain('world-of-printmaking');
  });

  it('limit=1 이면 1개만 반환', () => {
    const result = selectRelatedStories('editions-explained', 'buying-guide', pool, 1);
    expect(result.length).toBe(1);
  });

  it('pool이 비어있으면 빈 배열', () => {
    expect(selectRelatedStories('editions-explained', 'buying-guide', [], 3)).toEqual([]);
  });
});
