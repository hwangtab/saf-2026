import {
  SIZE_GUIDE_SLUG,
  EDITION_GUIDE_SLUG,
  PRINTMAKING_GUIDE_SLUG,
  PIGMENT_PRINT_GUIDE_SLUG,
  guideStoryHref,
  materialGuideSlug,
} from '../../lib/artwork-glossary-links';

describe('slug 상수', () => {
  it('SIZE_GUIDE_SLUG 값 검증', () => {
    expect(SIZE_GUIDE_SLUG).toBe('reading-art-sizes-ho-vs-cm');
  });

  it('EDITION_GUIDE_SLUG 값 검증', () => {
    expect(EDITION_GUIDE_SLUG).toBe('editions-explained');
  });
});

describe('materialGuideSlug', () => {
  describe('판화 계열 → PRINTMAKING_GUIDE_SLUG', () => {
    it('(사후판화)목판', () => {
      expect(materialGuideSlug('(사후판화)목판')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
    it('목판, 한지', () => {
      expect(materialGuideSlug('목판, 한지')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
    it('유성목판', () => {
      expect(materialGuideSlug('유성목판')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
    it('woodcut (영문)', () => {
      expect(materialGuideSlug('woodcut')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
    it('WOODCUT 대소문자 무관', () => {
      expect(materialGuideSlug('WOODCUT')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
    it('etching', () => {
      expect(materialGuideSlug('etching on zinc plate')).toBe(PRINTMAKING_GUIDE_SLUG);
    });
  });

  describe('pigment print 계열 → PIGMENT_PRINT_GUIDE_SLUG', () => {
    it('Archival pigment print', () => {
      expect(materialGuideSlug('Archival pigment print')).toBe(PIGMENT_PRINT_GUIDE_SLUG);
    });
    it('Pigment ink on FineArt Paper print', () => {
      expect(materialGuideSlug('Pigment ink on FineArt Paper print')).toBe(
        PIGMENT_PRINT_GUIDE_SLUG
      );
    });
    it('Pigment print', () => {
      expect(materialGuideSlug('Pigment print')).toBe(PIGMENT_PRINT_GUIDE_SLUG);
    });
    it('잉크젯', () => {
      expect(materialGuideSlug('한지에 잉크젯 출력')).toBe(PIGMENT_PRINT_GUIDE_SLUG);
    });
    it('ink-jet', () => {
      expect(materialGuideSlug('Hahnemühle Baryta FB, pigment ink-jet print')).toBe(
        PIGMENT_PRINT_GUIDE_SLUG
      );
    });
  });

  describe('false-positive guard — null 반환', () => {
    it('Pigment on watercolor texture (print 없음)', () => {
      expect(materialGuideSlug('Pigment on watercolor texture')).toBeNull();
    });
    it('Oil on canvas', () => {
      expect(materialGuideSlug('Oil on canvas')).toBeNull();
    });
    it('종이에 연필', () => {
      expect(materialGuideSlug('종이에 연필')).toBeNull();
    });
    it('확인 중', () => {
      expect(materialGuideSlug('확인 중')).toBeNull();
    });
    it('Acrylic on canvas', () => {
      expect(materialGuideSlug('Acrylic on canvas')).toBeNull();
    });
    it('null', () => {
      expect(materialGuideSlug(null)).toBeNull();
    });
    it('undefined', () => {
      expect(materialGuideSlug(undefined)).toBeNull();
    });
    it('빈 문자열', () => {
      expect(materialGuideSlug('')).toBeNull();
    });
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
