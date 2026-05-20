import {
  ARTIST_PRIMARY_STORY,
  getPrimaryStorySlug,
  pinPrimaryStory,
} from '../../lib/artist-story-map';
import type { Story } from '../../types';

function s(slug: string): Story {
  return {
    id: 'id-' + slug,
    slug,
    title: slug,
    title_en: undefined,
    category: 'artist-story',
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

describe('ARTIST_PRIMARY_STORY', () => {
  it('김주호 → meet-artist-kim-ju-ho', () => {
    expect(ARTIST_PRIMARY_STORY['김주호']).toBe('meet-artist-kim-ju-ho');
  });

  it('오윤 → oh-yun-40th-anniversary', () => {
    expect(ARTIST_PRIMARY_STORY['오윤']).toBe('oh-yun-40th-anniversary');
  });
});

describe('getPrimaryStorySlug', () => {
  it('등재 작가 → slug 반환', () => {
    expect(getPrimaryStorySlug('김주호')).toBe('meet-artist-kim-ju-ho');
  });

  it('미등재 작가 → null', () => {
    expect(getPrimaryStorySlug('홍길동')).toBeNull();
  });
});

describe('pinPrimaryStory', () => {
  const canonical = s('meet-artist-kim-ju-ho');
  const a = s('story-a');
  const b = s('story-b');

  it('정전 스토리가 중간에 있으면 맨 앞으로', () => {
    const result = pinPrimaryStory('김주호', [a, canonical, b]);
    expect(result[0].slug).toBe('meet-artist-kim-ju-ho');
  });

  it('정전 스토리가 마지막에 있어도 맨 앞으로', () => {
    const result = pinPrimaryStory('김주호', [a, b, canonical]);
    expect(result[0].slug).toBe('meet-artist-kim-ju-ho');
  });

  it('원본 pool에서 정전 스토리 중복 없음', () => {
    const result = pinPrimaryStory('김주호', [a, canonical, b]);
    const count = result.filter((s) => s.slug === 'meet-artist-kim-ju-ho').length;
    expect(count).toBe(1);
  });

  it('반환 길이 = pool 길이', () => {
    const result = pinPrimaryStory('김주호', [a, canonical, b]);
    expect(result.length).toBe(3);
  });

  it('미등재 작가 → pool 순서·길이 100% 동일', () => {
    const pool = [a, canonical, b];
    const result = pinPrimaryStory('홍길동', pool);
    expect(result.map((s) => s.slug)).toEqual(pool.map((s) => s.slug));
  });

  it('정전 스토리가 pool에 없으면 pool 그대로', () => {
    const pool = [a, b];
    const result = pinPrimaryStory('김주호', pool);
    expect(result.map((s) => s.slug)).toEqual(['story-a', 'story-b']);
  });

  it('pool이 비어있으면 빈 배열', () => {
    expect(pinPrimaryStory('김주호', [])).toEqual([]);
  });

  it('정전 스토리가 이미 맨 앞이면 순서 유지', () => {
    const result = pinPrimaryStory('김주호', [canonical, a, b]);
    expect(result[0].slug).toBe('meet-artist-kim-ju-ho');
    expect(result.length).toBe(3);
  });
});
