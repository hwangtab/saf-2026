import { isExhibitionSlug, OH_YOON_TERRACOTTA_EXHIBITION } from '@/lib/exhibitions';

describe('exhibitions 상수/가드', () => {
  it('알려진 슬러그를 통과시킨다', () => {
    expect(isExhibitionSlug('oh-yoon-terracotta')).toBe(true);
  });
  it('알 수 없는 값·null을 거른다', () => {
    expect(isExhibitionSlug('random')).toBe(false);
    expect(isExhibitionSlug(null)).toBe(false);
    expect(isExhibitionSlug(undefined)).toBe(false);
  });
  it('작가당 한도는 3', () => {
    expect(OH_YOON_TERRACOTTA_EXHIBITION.maxPerArtist).toBe(3);
  });
});
