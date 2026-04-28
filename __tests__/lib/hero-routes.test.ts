import { isArtworkDetail, isHeroRoute, HERO_ROUTES } from '../../lib/hero-routes';

describe('isHeroRoute', () => {
  // 재발 방지용 고정 케이스. 과거 버그 이력:
  //   - 2026-03-18: /transparency 등록 누락 → 항상 solid
  //   - 2026-04-07: /stories 등록 누락 + /stories/[slug] 접두어 체크 누락
  //   - 2026-04-17: startsWith('/terms')가 /terms-consent까지 오매칭 → 투명
  describe('정확 매칭 페이지', () => {
    it.each([
      '/',
      '/about',
      '/our-reality',
      '/our-proof',
      '/transparency',
      '/archive',
      '/archive/2023',
      '/archive/2026',
      '/news',
      '/artworks',
      '/stories',
      '/privacy',
      '/terms',
      '/petition/oh-yoon',
      '/special/oh-yoon',
    ])('%s는 hero 경로', (path) => {
      expect(isHeroRoute(path)).toBe(true);
    });
  });

  describe('접두어 매칭 — 하위 경로', () => {
    it.each([
      ['/stories/some-slug', true],
      ['/news/some-slug', true],
      ['/artworks/artist/kim-hyun', true],
      ['/artworks/category/painting', true],
      ['/terms/artist', true],
      ['/terms/exhibitor', true],
      ['/archive/2023/videos/abc123', true],
    ] as const)('%s → %s', (path, expected) => {
      expect(isHeroRoute(path)).toBe(expected);
    });
  });

  describe('접두어 오매칭 차단 (형제 경로)', () => {
    // /terms-consent는 /terms의 하위가 아닌 별개 인증 폼 페이지.
    // startsWith('/terms')로 잘못 매칭됐던 과거 버그에 대한 회귀 보호.
    it('/terms-consent는 hero 경로 아님', () => {
      expect(isHeroRoute('/terms-consent')).toBe(false);
    });

    // 접두어 배열이 모두 슬래시로 끝나 있어야 이런 오매칭이 차단됨.
    // EndsWithSlash 타입이 컴파일 타임에 이를 강제하지만, 런타임에도 확인.
    it('HERO_PREFIXES는 모두 슬래시로 끝남', () => {
      for (const prefix of HERO_ROUTES.prefixes) {
        expect(prefix.endsWith('/')).toBe(true);
      }
    });
  });

  describe('비-hero 페이지', () => {
    it.each([
      '/login',
      '/signup',
      '/admin',
      '/admin/dashboard',
      '/dashboard',
      '/dashboard/artworks',
      '/exhibitor',
      '/onboarding',
      '/auth/callback',
      '/checkout',
      '/orders',
      '/unknown-route',
    ])('%s는 hero 경로 아님', (path) => {
      expect(isHeroRoute(path)).toBe(false);
    });
  });

  describe('작품 상세 페이지 배제', () => {
    it('/artworks/[id]는 hero 경로 아님 (전용 상세 레이아웃)', () => {
      expect(isHeroRoute('/artworks/123')).toBe(false);
      expect(isHeroRoute('/artworks/some-slug')).toBe(false);
    });

    it('/artworks 목록은 hero 경로', () => {
      expect(isHeroRoute('/artworks')).toBe(true);
    });

    it('/artworks/artist/*와 /artworks/category/*는 hero 경로', () => {
      expect(isHeroRoute('/artworks/artist/kim')).toBe(true);
      expect(isHeroRoute('/artworks/category/oil')).toBe(true);
    });
  });
});

describe('isArtworkDetail', () => {
  it.each([
    ['/artworks/123', true],
    ['/artworks/some-slug', true],
    ['/artworks', false],
    ['/artworks/artist/kim', false],
    ['/artworks/category/oil', false],
    ['/stories/foo', false],
    ['/', false],
  ] as const)('%s → %s', (path, expected) => {
    expect(isArtworkDetail(path)).toBe(expected);
  });
});
