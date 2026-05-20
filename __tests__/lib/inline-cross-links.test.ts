import {
  generateInlineCrossLinks,
  insertCrossLinksBeforeFinalCta,
} from '../../lib/inline-cross-links';
import type { Story } from '../../types';

function story(overrides: Partial<Story>): Story {
  return {
    id: 'id-' + (overrides.slug ?? 'x'),
    slug: overrides.slug ?? 'slug',
    title: overrides.title ?? '제목',
    title_en: overrides.title_en,
    category: overrides.category ?? 'buying-guide',
    excerpt: overrides.excerpt ?? '요약',
    excerpt_en: overrides.excerpt_en,
    body: '',
    body_en: undefined,
    thumbnail: undefined,
    author: undefined,
    published_at: '2026-05-01',
    updated_at: undefined,
    is_published: true,
    display_order: 0,
    tags: undefined,
  };
}

describe('generateInlineCrossLinks', () => {
  it('빈 카테고리는 빈 문자열', () => {
    expect(
      generateInlineCrossLinks({
        currentSlug: 's1',
        sameCategoryStories: [],
        isEnglish: false,
      })
    ).toBe('');
  });

  it('현재 글만 있으면 빈 문자열', () => {
    expect(
      generateInlineCrossLinks({
        currentSlug: 's1',
        sameCategoryStories: [story({ slug: 's1' })],
        isEnglish: false,
      })
    ).toBe('');
  });

  it('한국어 markdown 섹션 생성', () => {
    const result = generateInlineCrossLinks({
      currentSlug: 's1',
      sameCategoryStories: [
        story({ slug: 's1', title: '현재 글' }),
        story({ slug: 's2', title: '두 번째 글', excerpt: '두 번째 요약' }),
        story({ slug: 's3', title: '세 번째 글', excerpt: '세 번째 요약' }),
      ],
      isEnglish: false,
    });
    expect(result).toContain('## 함께 읽으면 좋은 글');
    expect(result).toContain('[두 번째 글](/stories/s2) — 두 번째 요약');
    expect(result).toContain('[세 번째 글](/stories/s3) — 세 번째 요약');
    expect(result).not.toContain('현재 글');
  });

  it('영문 markdown 섹션 생성 — /en/stories/ prefix', () => {
    const result = generateInlineCrossLinks({
      currentSlug: 's1',
      sameCategoryStories: [
        story({ slug: 's2', title: 'Korean', title_en: 'English Title', excerpt_en: 'English ex' }),
      ],
      isEnglish: true,
    });
    expect(result).toContain('## Related reading');
    expect(result).toContain('[English Title](/en/stories/s2) — English ex');
  });
});

describe('insertCrossLinksBeforeFinalCta', () => {
  const cross = '\n\n## 다음 글\n\n- [Other](/stories/other)\n';

  it('빈 cross-link은 본문 그대로', () => {
    expect(insertCrossLinksBeforeFinalCta('# 제목\n\n본문', '')).toBe('# 제목\n\n본문');
  });

  it('horizontal rule 직전에 삽입', () => {
    const body = `# 제목

본문 단락.

---

마무리.`;
    const result = insertCrossLinksBeforeFinalCta(body, cross);
    // ## 다음 글 섹션이 --- 보다 앞에 나옴
    expect(result.indexOf('## 다음 글')).toBeLessThan(result.indexOf('---'));
  });

  it('본문 끝의 단독 link 라인 직전에 삽입', () => {
    const body = `# 제목

본문 단락.

[씨앗페에서 작품 보기 →](/artworks)`;
    const result = insertCrossLinksBeforeFinalCta(body, cross);
    expect(result.indexOf('## 다음 글')).toBeLessThan(result.indexOf('[씨앗페에서'));
  });

  it('anchor가 없으면 단순 append', () => {
    const body = '# 제목\n\n본문 단락만 있고 끝.';
    const result = insertCrossLinksBeforeFinalCta(body, cross);
    expect(result).toBe(body + cross);
  });
});
