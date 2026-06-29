import {
  IG_MAX_ASPECT_RATIO,
  IG_MIN_ASPECT_RATIO,
  needsLetterbox,
  wrapInstagramImageUrl,
} from '@/lib/social/letterbox';

describe('needsLetterbox', () => {
  it('정사각(1:1)은 패딩 불필요', () => {
    expect(needsLetterbox(1080, 1080)).toBe(false);
  });

  it('허용 범위 내 가로(1.5:1)는 패딩 불필요', () => {
    expect(needsLetterbox(1500, 1000)).toBe(false);
  });

  it('허용 범위 내 세로(4:5=0.8)는 패딩 불필요', () => {
    expect(needsLetterbox(800, 1000)).toBe(false);
  });

  it('상한 초과 가로 작품은 패딩 필요 (실패 사례: 71x36 ≈ 1.97:1)', () => {
    expect(needsLetterbox(71, 36)).toBe(true);
  });

  it('상한 크게 초과 가로 작품은 패딩 필요 (실패 사례: 227x90 ≈ 2.52:1)', () => {
    expect(needsLetterbox(227, 90)).toBe(true);
  });

  it('하한 미만 세로 작품은 패딩 필요 (예: 60x100 = 0.6)', () => {
    expect(needsLetterbox(60, 100)).toBe(true);
  });

  it('경계값(상·하한 정확히)은 패딩 불필요', () => {
    expect(needsLetterbox(IG_MAX_ASPECT_RATIO * 1000, 1000)).toBe(false);
    expect(needsLetterbox(IG_MIN_ASPECT_RATIO * 1000, 1000)).toBe(false);
  });

  it('유효하지 않은 치수(0·음수·NaN)는 안전하게 false', () => {
    expect(needsLetterbox(0, 1000)).toBe(false);
    expect(needsLetterbox(1000, 0)).toBe(false);
    expect(needsLetterbox(-100, 100)).toBe(false);
    expect(needsLetterbox(NaN, 100)).toBe(false);
  });
});

describe('wrapInstagramImageUrl', () => {
  it('https 절대 URL을 letterbox 라우트로 감싸고 src를 인코딩', () => {
    const src = 'https://proj.supabase.co/storage/v1/object/public/artworks/a__original.jpg';
    const wrapped = wrapInstagramImageUrl(src);
    expect(wrapped).toMatch(/\/api\/social\/letterbox\?src=/);
    expect(wrapped).toContain(encodeURIComponent(src));
  });

  it('http 절대 URL도 감싼다(라우트가 fetch 가능)', () => {
    expect(wrapInstagramImageUrl('http://example.com/a.jpg')).toMatch(
      /\/api\/social\/letterbox\?src=/
    );
  });

  it('상대 경로/비URL은 감싸지 않고 그대로 반환', () => {
    expect(wrapInstagramImageUrl('/images/a.jpg')).toBe('/images/a.jpg');
  });

  it('빈 값/null이면 null', () => {
    expect(wrapInstagramImageUrl(null)).toBeNull();
    expect(wrapInstagramImageUrl(undefined)).toBeNull();
    expect(wrapInstagramImageUrl('')).toBeNull();
  });
});
