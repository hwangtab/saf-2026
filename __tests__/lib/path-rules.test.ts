import {
  belongsToSurface,
  isProtectedSurfacePath,
  shouldShowFooterSlider,
} from '../../lib/path-rules';

describe('belongsToSurface', () => {
  it('정확 매칭', () => {
    expect(belongsToSurface('/admin', '/admin')).toBe(true);
  });

  it('하위 경로 매칭', () => {
    expect(belongsToSurface('/admin/users', '/admin')).toBe(true);
    expect(belongsToSurface('/admin/users/123', '/admin')).toBe(true);
  });

  // 재발 방지 — pathname.startsWith(surface)가 형제 경로를 잘못 매칭하던 구조적 취약점 차단
  it('형제 경로 차단 (/admin-foo ≠ /admin)', () => {
    expect(belongsToSurface('/admin-foo', '/admin')).toBe(false);
    expect(belongsToSurface('/admin2', '/admin')).toBe(false);
    expect(belongsToSurface('/login-complete', '/login')).toBe(false);
    expect(belongsToSurface('/api-v2', '/api')).toBe(false);
  });

  it('무관한 경로 차단', () => {
    expect(belongsToSurface('/users', '/admin')).toBe(false);
    expect(belongsToSurface('/', '/admin')).toBe(false);
  });
});

describe('isProtectedSurfacePath', () => {
  it.each([
    // 포털 surface 자체 및 하위 — true
    ['/admin', true],
    ['/admin/users', true],
    ['/dashboard', true],
    ['/dashboard/artworks', true],
    ['/exhibitor', true],
    ['/exhibitor/artworks/123', true],
    // 형제 경로 — false (구조적 방어)
    ['/admin-foo', false],
    ['/dashboard2', false],
    ['/exhibitors', false],
    // 비보호 경로 — false
    ['/', false],
    ['/artworks', false],
    ['/login', false],
    ['/onboarding', false],
    [null, false],
    [undefined, false],
  ])('%s → %s', (path, expected) => {
    expect(isProtectedSurfacePath(path)).toBe(expected);
  });
});

describe('shouldShowFooterSlider', () => {
  it.each([
    // 제외 정확 경로
    ['/', false],
    ['/artworks', false],
    // 포털 영역 — 제외
    ['/admin/dashboard', false],
    ['/dashboard/artworks', false],
    ['/exhibitor', false],
    ['/onboarding/artist', false],
    // 형제 경로는 "포털 제외" 대상이 아니므로 true (상위 규칙에서 공개 surface 취급)
    ['/admin-news', true],
    // 공개 페이지 — true
    ['/artworks/123', true],
    ['/stories/slug', true],
    ['/news/latest', true],
    [null, false],
  ])('%s → %s', (path, expected) => {
    expect(shouldShowFooterSlider(path)).toBe(expected);
  });
});
