import koMessages from '../../messages/ko.json';
import enMessages from '../../messages/en.json';
import { STORIES_SEO_OVERRIDES } from '../../lib/stories-seo-overrides';

describe('content CTR metadata targets', () => {
  it('matches high-impression story queries directly in Korean SERP titles and descriptions', () => {
    expect(STORIES_SEO_OVERRIDES['reading-art-sizes-ho-vs-cm']).toMatchObject({
      titleKo: expect.stringContaining('10호·30호 그림 크기'),
      descriptionKo: expect.stringContaining('10호는 53×45.5cm'),
    });
    expect(STORIES_SEO_OVERRIDES['reading-art-sizes-ho-vs-cm']?.descriptionKo).toContain(
      '30호는 90×72.7cm'
    );

    expect(STORIES_SEO_OVERRIDES['editions-explained']).toMatchObject({
      titleKo: expect.stringContaining('에디션 뜻 쉽게 정리'),
      descriptionKo: expect.stringContaining('5/10은 10점 중 5번째'),
    });

    expect(STORIES_SEO_OVERRIDES['archival-pigment-print-photography']).toMatchObject({
      titleKo: expect.stringContaining('피그먼트 뜻'),
      descriptionKo: expect.stringContaining('피그먼트는 염료가 아닌 안료 잉크'),
    });

    expect(STORIES_SEO_OVERRIDES['prints-vs-originals-and-edition-numbers']).toMatchObject({
      titleKo: expect.stringContaining('넘버링 뜻'),
      descriptionKo: expect.stringContaining('3/30, AP, EA, HC, PP'),
    });
  });

  it('positions Oh Yoon petition metadata for artist, print, artwork, and estate intent', () => {
    expect(koMessages.petition.ohYoon.metaTitle).toContain('오윤 작가와 판화 작품');
    expect(koMessages.petition.ohYoon.metaTitle).toContain('유족의 권리 회복');
    expect(koMessages.petition.ohYoon.metaDescription).toContain('오윤 작가의 판화와 작품 세계');
    expect(koMessages.petition.ohYoon.metaDescription).toContain('유족');

    expect(enMessages.petition.ohYoon.metaTitle).toContain('Oh Yoon');
    expect(enMessages.petition.ohYoon.metaTitle).toContain('prints and artworks');
  });
});
