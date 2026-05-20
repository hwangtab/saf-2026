import {
  SIZE_GUIDE_SLUG,
  EDITION_GUIDE_SLUG,
  guideStoryHref,
} from '../../lib/artwork-glossary-links';

describe('slug 상수', () => {
  it('SIZE_GUIDE_SLUG 값 검증', () => {
    expect(SIZE_GUIDE_SLUG).toBe('reading-art-sizes-ho-vs-cm');
  });

  it('EDITION_GUIDE_SLUG 값 검증', () => {
    expect(EDITION_GUIDE_SLUG).toBe('editions-explained');
  });
});

describe('guideStoryHref', () => {
  it('KO → /stories/{slug}', () => {
    expect(guideStoryHref(SIZE_GUIDE_SLUG, false)).toBe('/stories/reading-art-sizes-ho-vs-cm');
  });

  it('EN → /en/stories/{slug}', () => {
    expect(guideStoryHref(SIZE_GUIDE_SLUG, true)).toBe('/en/stories/reading-art-sizes-ho-vs-cm');
  });

  it('KO EDITION → /stories/editions-explained', () => {
    expect(guideStoryHref(EDITION_GUIDE_SLUG, false)).toBe('/stories/editions-explained');
  });

  it('EN EDITION → /en/stories/editions-explained', () => {
    expect(guideStoryHref(EDITION_GUIDE_SLUG, true)).toBe('/en/stories/editions-explained');
  });

  it('임의 slug KO', () => {
    expect(guideStoryHref('some-story', false)).toBe('/stories/some-story');
  });

  it('임의 slug EN', () => {
    expect(guideStoryHref('some-story', true)).toBe('/en/stories/some-story');
  });
});
